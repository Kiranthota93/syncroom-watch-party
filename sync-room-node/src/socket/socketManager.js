const { Server } = require("socket.io");
const config  = require("../config");
const Room    = require("../models/roomModel");
const Message = require("../models/messageModel");
const { SOCKET }              = require("../constants/events");
const { PLAYBACK }            = require("../constants/playback");
const { createLogger }        = require("../utils/logger");
const { recordWatchSession }  = require("../utils/watchSession");

const log = createLogger("socketManager");

let io;

// participant_id -> setTimeout handle. A disconnect starts a grace-period
// timer here instead of tearing the participant down immediately; JOIN_ROOM
// cancels it if they reconnect in time. See finalizeDisconnect below.
const pendingDisconnects = new Map();

// Re-announces an already-in-call participant to the mesh on a grace-period
// resume — their old RTCPeerConnections are gone (fresh JS context after a
// reload) even though server-side call state never changed, so both sides
// need to rebuild from scratch, same as a first-time join.
const announceRtcResume = (socket, room, participant) => {
  if (!participant.in_voice_call && !participant.in_video_call) return;
  const peers = room.participants.filter(
    (p) => p.socket_id && p.socket_id !== socket.id && (p.in_voice_call || p.in_video_call)
  );

  // Existing peers still hold their OLD RTCPeerConnection to this
  // participant — nothing ever told them it died, since the whole point of
  // the grace period is to stay silent during a quick reconnect. Left alone,
  // an incoming offer would reuse (and fail to renegotiate on) that stale
  // connection instead of building a fresh one. Force-close it first so the
  // upcoming offer lands on a clean slate, same as any other first-time join.
  socket.to(room.invite_token).emit(SOCKET.RTC_PEER_LEFT, {
    participant_id: participant.participant_id,
  });

  socket.emit(SOCKET.RTC_PEERS, {
    peers: peers.map((p) => ({ participant_id: p.participant_id, display_name: p.display_name })),
  });
  socket.to(room.invite_token).emit(SOCKET.RTC_PEER_JOINED, {
    participant_id: participant.participant_id,
    display_name:   participant.display_name,
  });
};

// The actual teardown, previously run synchronously inside the "disconnect"
// handler — now deferred by config.disconnectGraceMs so a page reload isn't
// indistinguishable from actually leaving. Re-fetches the room fresh since
// time has passed since the timer was scheduled.
const finalizeDisconnect = async (invite_token, participant_id) => {
  pendingDisconnects.delete(participant_id);

  try {
    const room = await Room.findOne({ invite_token, status: "active" });
    if (!room) return;

    const participant = room.participants.find((p) => p.participant_id === participant_id);
    // Guard: skip if they reconnected (JOIN_ROOM already flipped is_online back
    // to true) or already left via another path (e.g. leaveRoom REST).
    if (!participant || !participant.is_online) return;

    const wasInCall = participant.in_voice_call || participant.in_video_call;

    participant.is_online   = false;
    participant.left_at     = new Date();
    participant.socket_id   = null;
    participant.hand_raised = false; // auto-lower hand on disconnect
    participant.in_voice_call = false;
    participant.in_video_call = false;
    participant.mic_on        = false;
    participant.cam_on        = false;

    room.activity_logs.push({
      type: "participant_left",
      message: `${participant.display_name} disconnected`,
    });

    if (
      room.controller_participant_id === participant.participant_id &&
      room.host_participant_id !== participant.participant_id
    ) {
      room.controller_participant_id = room.host_participant_id;
      room.activity_logs.push({
        type: "controller_auto_recovered",
        message: "Controller returned to host",
      });
    }

    await room.save();

    // Record watch session for the disconnecting participant
    recordWatchSession(room, participant);

    if (wasInCall) {
      io.to(room.invite_token).emit(SOCKET.RTC_PEER_LEFT, {
        participant_id: participant.participant_id,
      });
    }

    io.to(room.invite_token).emit(SOCKET.ROOM_UPDATED, { room });
  } catch (err) {
    log.error("finalizeDisconnect", { error: err.message });
  }
};

// Reused by playback event handlers (Phases 3.5–3.8)
// Returns { room, participant } if authorized, null otherwise
const getControllerContext = async (socketId, invite_token) => {

    const room = await Room.findOne({ invite_token, status: "active" });

    if (!room) return null;

    const participant = room.participants.find((p) => p.socket_id === socketId);

    if (!participant) return null;

    if (room.controller_participant_id !== participant.participant_id) return null;

    return { room, participant };
  };

// Self-service call events (voice/video join/leave/toggle) — the caller only
// ever acts on their own participant record, found by their live socket_id.
const findSelf = (room, socketId) => room.participants.find((p) => p.socket_id === socketId);

// Pure envelope relay for WebRTC signaling — the server never inspects sdp/candidate.
const relayToParticipant = async (invite_token, to_participant_id, event, payload) => {
  const room = await Room.findOne({ invite_token, status: "active" });
  if (!room) return;
  const target = room.participants.find((p) => p.participant_id === to_participant_id && p.socket_id);
  if (!target) return;
  io.to(target.socket_id).emit(event, payload);
};

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      // Must match app.js — a socket handshake is a normal CORS request, so an
      // origin allowed for the API but not here fails the upgrade in a way that
      // surfaces only as a browser-side connect_error.
      origin: config.clientUrls,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    log.info("Socket connected", { socketId: socket.id });

    socket.on(SOCKET.PLAYBACK_PLAY, async ({ invite_token, current_time }) => {
      try {
        const ctx = await getControllerContext(socket.id, invite_token);
        if (!ctx) return;

        const { room, participant } = ctx;

        // Update status and the time-reference anchor only.
        // current_time is NOT modified here — it is the exclusive responsibility
        // of playback:seek (and playback:pause for paused-state joins).
        // This ensures the heartbeat's expected-position formula always derives
        // from an explicit seek, never from a play event that may carry a stale
        // position (e.g. when play fires after a seek-while-playing before the
        // seek event has propagated).
        room.playback_state.status     = "playing";
        room.playback_state.updated_at = new Date();
        room.playback_state.updated_by = participant.participant_id;

        // Watch mode: open mics/cameras would pick up the movie's own audio,
        // so content starting to play force-cuts everyone's call state.
        room.participants.forEach((p) => {
          p.mic_on = false;
          p.cam_on = false;
        });

        room.activity_logs.push({
          type:    "playback_play",
          message: `${participant.display_name} started playback`,
        });

        await room.save();

        io.to(invite_token).emit(SOCKET.PLAYBACK_PLAY, { current_time });
        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("playback:play handler", { error: err.message });
      }
    });

    socket.on(SOCKET.PLAYBACK_PAUSE, async ({ invite_token, current_time }) => {
      try {
        const ctx = await getControllerContext(socket.id, invite_token);
        if (!ctx) return;

        const { room, participant } = ctx;

        room.playback_state.status = "paused";
        room.playback_state.current_time = current_time;
        room.playback_state.updated_at = new Date();
        room.playback_state.updated_by = participant.participant_id;

        room.activity_logs.push({
          type: "playback_pause",
          message: `${participant.display_name} paused playback`,
        });

        await room.save();

        io.to(invite_token).emit(SOCKET.PLAYBACK_PAUSE, { current_time });
        // ROOM_UPDATED is the only thing that refreshes clients' copy of
        // playback_state. playback:play emits it; without the matching emit
        // here, clients kept status:"playing" after a pause forever — which
        // left voice chat disabled (it gates on status === "playing") until
        // some unrelated event happened to refresh the room.
        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("playback:pause handler", { error: err.message });
      }
    });

    socket.on(SOCKET.PLAYBACK_SEEK, async ({ invite_token, current_time }) => {
      try {
        const ctx = await getControllerContext(socket.id, invite_token);
        if (!ctx) return;

        const { room } = ctx;

        room.playback_state.current_time = current_time;
        room.playback_state.updated_at = new Date();
        room.playback_state.updated_by = ctx.participant.participant_id;

        await room.save();

        io.to(invite_token).emit(SOCKET.PLAYBACK_SEEK, {
          current_time,
          status: room.playback_state.status,
        });
      } catch (err) {
        log.error("playback:seek handler", { error: err.message });
      }
    });

    socket.on(SOCKET.PLAYBACK_RATE, async ({ invite_token, playback_rate }) => {
      try {
        const ctx = await getControllerContext(socket.id, invite_token);
        if (!ctx) return;

        const validRates = PLAYBACK.VALID_RATES;
        if (!validRates.includes(playback_rate)) return;

        const { room, participant } = ctx;

        room.playback_state.playback_rate = playback_rate;
        room.playback_state.updated_at = new Date();
        room.playback_state.updated_by = participant.participant_id;

        room.activity_logs.push({
          type: "playback_rate_change",
          message: `${participant.display_name} changed speed to ${playback_rate}x`,
        });

        await room.save();

        io.to(invite_token).emit(SOCKET.PLAYBACK_RATE, { playback_rate });
      } catch (err) {
        log.error("playback:rate handler", { error: err.message });
      }
    });

    socket.on(SOCKET.PLAYBACK_HEARTBEAT, async ({ invite_token, current_time }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room?.playback_state) return;

        const { playback_state } = room;
        if (playback_state.status !== "playing") return;
        if (!playback_state.updated_at) return;

        const elapsedSeconds =
          (Date.now() - new Date(playback_state.updated_at).getTime()) / 1000;

        const expected =
          playback_state.current_time +
          elapsedSeconds * (playback_state.playback_rate || 1);

        const drift = Math.abs(current_time - expected);

        if (drift > PLAYBACK.DRIFT_THRESHOLD_S) {
          socket.emit(SOCKET.PLAYBACK_SYNC, {
            current_time: expected,
            status: playback_state.status,
          });
        }
      } catch (err) {
        log.error("playback:heartbeat handler", { error: err.message });
      }
    });

    socket.on(SOCKET.JOIN_ROOM, async ({ invite_token, participant_id }) => {
      socket.join(invite_token);

      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;

        const participant = room.participants.find(
          (p) => p.participant_id === participant_id
        );
        if (!participant) return;

        participant.socket_id = socket.id;
        participant.is_online = true;
        participant.left_at = null;

        await room.save();

        const pendingTimer = pendingDisconnects.get(participant_id);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          pendingDisconnects.delete(participant_id);
          // Old RTCPeerConnections died with the previous page — rebuild the
          // mesh even though server-side call state never changed.
          announceRtcResume(socket, room, participant);
        }

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

        // Send chat history to the joining client
        const history = await Message.find({ invite_token })
          .sort({ created_at: 1 })
          .limit(50)
          .lean();
        socket.emit(SOCKET.CHAT_HISTORY, { messages: history });
      } catch (err) {
        log.error("join-room handler", { error: err.message });
      }
    });

    // ── Controller request ───────────────────────────────────────

    socket.on(SOCKET.CONTROLLER_REQUEST, async ({ invite_token, participant_id }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;

        if (room.settings?.allow_controller_requests === false) return;

        const requester = room.participants.find(
          (p) => p.participant_id === participant_id && p.is_online
        );
        if (!requester) return;

        // Must not already be the controller
        if (room.controller_participant_id === participant_id) return;

        // Find host's socket
        const host = room.participants.find(
          (p) => p.participant_id === room.host_participant_id && p.socket_id
        );
        if (!host) return;

        // Notify host only
        io.to(host.socket_id).emit(SOCKET.CONTROLLER_REQUEST_NOTIFY, {
          participant_id:  requester.participant_id,
          display_name:    requester.display_name,
          invite_token,
        });
      } catch (err) {
        log.error("controller:request handler", { error: err.message });
      }
    });

    // ── Emoji reactions (ephemeral — no DB write) ────────────────

    const ALLOWED_EMOJIS = new Set(['❤️','😂','🔥','👏','👍','😮']);

    socket.on(SOCKET.REACTION_SEND, async ({ invite_token, emoji }) => {
      try {
        if (!ALLOWED_EMOJIS.has(emoji)) return;
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        if (room.settings?.allow_emoji_reactions === false) return;
        const participant = room.participants.find((p) => p.socket_id === socket.id);
        if (!participant) return;
        io.to(invite_token).emit(SOCKET.REACTION_EMIT, {
          emoji,
          display_name: participant.display_name,
        });
      } catch (err) {
        log.error("reaction:send handler", { error: err.message });
      }
    });

    // ── Ping (ephemeral attention-getter — no DB write) ──────────

    socket.on(SOCKET.PARTICIPANT_PING, async ({ invite_token, target_participant_id }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;

        const sender = findSelf(room, socket.id);
        if (!sender) return;

        const target = room.participants.find(
          (p) => p.participant_id === target_participant_id && p.socket_id
        );
        if (!target) return;

        io.to(target.socket_id).emit(SOCKET.PARTICIPANT_PING_NOTIFY, {
          display_name: sender.display_name,
        });
      } catch (err) {
        log.error("participant:ping handler", { error: err.message });
      }
    });

    // ── Chat ─────────────────────────────────────────────────────

    socket.on(SOCKET.CHAT_MESSAGE, async ({ invite_token, participant_id, message }) => {
      try {
        if (!invite_token || !participant_id || !message?.trim()) return;
        if (message.trim().length > 500) return;

        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        if (room.settings?.allow_chat === false) return;

        const participant = room.participants.find(
          (p) => p.participant_id === participant_id && p.is_online
        );
        if (!participant) return;
        if (participant.is_muted) return; // silently drop muted participant messages

        const doc = await Message.create({
          invite_token,
          participant_id,
          display_name: participant.display_name,
          message:      message.trim(),
          type:         "text",
        });

        io.to(invite_token).emit(SOCKET.CHAT_MESSAGE, {
          _id:            doc._id,
          participant_id: doc.participant_id,
          display_name:   doc.display_name,
          message:        doc.message,
          type:           doc.type,
          created_at:     doc.created_at,
        });
      } catch (err) {
        log.error("chat:message handler", { error: err.message });
      }
    });

    // Relay typing indicator to the room (no DB write — ephemeral)
    socket.on(SOCKET.CHAT_TYPING, ({ invite_token, participant_id, display_name, typing }) => {
      if (!invite_token) return;
      socket.to(invite_token).emit(SOCKET.CHAT_TYPING, { participant_id, display_name, typing });
    });

    // ── Watch/Social mode: request the controller to pause ──────

    socket.on(SOCKET.PLAYBACK_PAUSE_REQUEST, async ({ invite_token, participant_id }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        if (room.playback_state?.status !== "playing") return;

        const requester = room.participants.find(
          (p) => p.participant_id === participant_id && p.is_online
        );
        if (!requester) return;

        const controller = room.participants.find(
          (p) => p.participant_id === room.controller_participant_id && p.socket_id
        );
        if (!controller) return;

        io.to(controller.socket_id).emit(SOCKET.PLAYBACK_PAUSE_REQUEST_NOTIFY, {
          participant_id: requester.participant_id,
          display_name:   requester.display_name,
          invite_token,
        });
      } catch (err) {
        log.error("playback:pause-request handler", { error: err.message });
      }
    });

    // ── Voice call ────────────────────────────────────────────────

    socket.on(SOCKET.VOICE_JOIN, async ({ invite_token }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        const self = findSelf(room, socket.id);
        if (!self) return;

        const wasInCall = self.in_voice_call || self.in_video_call;
        self.in_voice_call = true;
        await room.save();

        // Only trigger mesh peer discovery the first time this participant
        // enters a call (voice or video) — enabling the other later just adds
        // a track to the already-negotiated peer connection.
        if (!wasInCall) {
          const peers = room.participants.filter(
            (p) => p.socket_id && p.socket_id !== socket.id && (p.in_voice_call || p.in_video_call)
          );
          socket.emit(SOCKET.RTC_PEERS, {
            peers: peers.map((p) => ({ participant_id: p.participant_id, display_name: p.display_name })),
          });
          socket.to(invite_token).emit(SOCKET.RTC_PEER_JOINED, {
            participant_id: self.participant_id,
            display_name:   self.display_name,
          });
        }

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("voice:join handler", { error: err.message });
      }
    });

    socket.on(SOCKET.VOICE_LEAVE, async ({ invite_token }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        const self = findSelf(room, socket.id);
        if (!self) return;

        self.in_voice_call = false;
        self.mic_on = false;
        await room.save();

        if (!self.in_video_call) {
          socket.to(invite_token).emit(SOCKET.RTC_PEER_LEFT, { participant_id: self.participant_id });
        }

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("voice:leave handler", { error: err.message });
      }
    });

    socket.on(SOCKET.VOICE_TOGGLE_MIC, async ({ invite_token, mic_on }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        const self = findSelf(room, socket.id);
        if (!self) return;

        if (mic_on) {
          if (self.muted_by_host) {
            socket.emit(SOCKET.VOICE_MIC_REJECTED, {
              code: "muted_by_host", message: "The host has muted you.",
            });
            return;
          }
          if (room.playback_state?.status === "playing") {
            socket.emit(SOCKET.VOICE_MIC_REJECTED, {
              code: "muted_while_playing", message: "You can't talk while content is playing.",
            });
            return;
          }
        }

        self.mic_on = mic_on;
        await room.save();

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("voice:toggle-mic handler", { error: err.message });
      }
    });

    // Ephemeral speaking indicator — trusts the client-supplied participant_id,
    // same trust model as chat:typing above. No DB write.
    socket.on(SOCKET.VOICE_SPEAKING, ({ invite_token, participant_id, speaking }) => {
      if (!invite_token) return;
      socket.to(invite_token).emit(SOCKET.VOICE_SPEAKING, { participant_id, speaking });
    });

    // ── Video call ────────────────────────────────────────────────

    socket.on(SOCKET.VIDEO_JOIN, async ({ invite_token }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        const self = findSelf(room, socket.id);
        if (!self) return;

        const wasInCall = self.in_voice_call || self.in_video_call;
        self.in_video_call = true;
        await room.save();

        if (!wasInCall) {
          const peers = room.participants.filter(
            (p) => p.socket_id && p.socket_id !== socket.id && (p.in_voice_call || p.in_video_call)
          );
          socket.emit(SOCKET.RTC_PEERS, {
            peers: peers.map((p) => ({ participant_id: p.participant_id, display_name: p.display_name })),
          });
          socket.to(invite_token).emit(SOCKET.RTC_PEER_JOINED, {
            participant_id: self.participant_id,
            display_name:   self.display_name,
          });
        }

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("video:join handler", { error: err.message });
      }
    });

    socket.on(SOCKET.VIDEO_LEAVE, async ({ invite_token }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        const self = findSelf(room, socket.id);
        if (!self) return;

        self.in_video_call = false;
        self.cam_on = false;
        await room.save();

        if (!self.in_voice_call) {
          socket.to(invite_token).emit(SOCKET.RTC_PEER_LEFT, { participant_id: self.participant_id });
        }

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("video:leave handler", { error: err.message });
      }
    });

    socket.on(SOCKET.VIDEO_TOGGLE_CAM, async ({ invite_token, cam_on }) => {
      try {
        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;
        const self = findSelf(room, socket.id);
        if (!self) return;

        if (cam_on) {
          if (room.playback_state?.status === "playing") {
            socket.emit(SOCKET.VIDEO_CAM_REJECTED, {
              code: "muted_while_playing", message: "You can't share video while content is playing.",
            });
            return;
          }
          const camerasOn = room.participants.filter((p) => p.cam_on).length;
          if (camerasOn >= config.maxCamerasOn) {
            socket.emit(SOCKET.VIDEO_CAM_REJECTED, {
              code: "camera_limit_reached", message: `Camera limit reached (${config.maxCamerasOn} max).`,
            });
            return;
          }
        }

        self.cam_on = cam_on;
        await room.save();

        io.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });
      } catch (err) {
        log.error("video:toggle-cam handler", { error: err.message });
      }
    });

    // ── WebRTC signaling relay (mesh) ─────────────────────────────

    socket.on(SOCKET.RTC_OFFER, async ({ invite_token, to_participant_id, from_participant_id, sdp }) => {
      try {
        await relayToParticipant(invite_token, to_participant_id, SOCKET.RTC_OFFER, { from_participant_id, sdp });
      } catch (err) {
        log.error("rtc:offer handler", { error: err.message });
      }
    });

    socket.on(SOCKET.RTC_ANSWER, async ({ invite_token, to_participant_id, from_participant_id, sdp }) => {
      try {
        await relayToParticipant(invite_token, to_participant_id, SOCKET.RTC_ANSWER, { from_participant_id, sdp });
      } catch (err) {
        log.error("rtc:answer handler", { error: err.message });
      }
    });

    socket.on(SOCKET.RTC_ICE_CANDIDATE, async ({ invite_token, to_participant_id, from_participant_id, candidate }) => {
      try {
        await relayToParticipant(invite_token, to_participant_id, SOCKET.RTC_ICE_CANDIDATE, { from_participant_id, candidate });
      } catch (err) {
        log.error("rtc:ice-candidate handler", { error: err.message });
      }
    });

    socket.on("disconnect", async () => {
      log.info("Socket disconnected", { socketId: socket.id });

      try {
        const room = await Room.findOne({
          "participants.socket_id": socket.id,
          status: "active",
        });

        if (!room) return;

        const participant = room.participants.find(
          (p) => p.socket_id === socket.id
        );
        // Guard: skip if already marked offline (e.g. leaveRoom REST ran first)
        if (!participant || !participant.is_online) return;

        // Don't tear anything down yet — clear the dead socket_id so nothing
        // tries to signal it, then give the participant a grace window to
        // reconnect (JOIN_ROOM) before finalizeDisconnect actually runs. Every
        // other field (is_online, call membership, controller role, etc.)
        // stays untouched until the timer fires, so a quick reload is
        // invisible to the rest of the room.
        participant.socket_id = null;
        await room.save();

        const { invite_token } = room;
        const { participant_id } = participant;

        const existingTimer = pendingDisconnects.get(participant_id);
        if (existingTimer) clearTimeout(existingTimer);

        pendingDisconnects.set(
          participant_id,
          setTimeout(() => finalizeDisconnect(invite_token, participant_id), config.disconnectGraceMs)
        );
      } catch (err) {
        log.error("disconnect handler", { error: err.message });
      }
    });
  });
};

const getIO = () => io;

module.exports = { init, getIO, getControllerContext };
