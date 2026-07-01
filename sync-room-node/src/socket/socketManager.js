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

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
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

        room.activity_logs.push({
          type:    "playback_play",
          message: `${participant.display_name} started playback`,
        });

        await room.save();

        io.to(invite_token).emit(SOCKET.PLAYBACK_PLAY, { current_time });
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

    // ── Chat ─────────────────────────────────────────────────────

    socket.on(SOCKET.CHAT_MESSAGE, async ({ invite_token, participant_id, message }) => {
      try {
        if (!invite_token || !participant_id || !message?.trim()) return;
        if (message.trim().length > 500) return;

        const room = await Room.findOne({ invite_token, status: "active" });
        if (!room) return;

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

        participant.is_online   = false;
        participant.left_at     = new Date();
        participant.socket_id   = null;
        participant.hand_raised = false; // auto-lower hand on disconnect

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

        io.to(room.invite_token).emit("room:updated", { room });
      } catch (err) {
        log.error("disconnect handler", { error: err.message });
      }
    });
  });
};

const getIO = () => io;

module.exports = { init, getIO, getControllerContext };
