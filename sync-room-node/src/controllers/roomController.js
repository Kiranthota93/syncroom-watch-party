const Room = require("../models/roomModel");
const WatchSession = require("../models/watchSessionModel");
const generateRoomCode = require("../utils/generateRoomCode");
const crypto = require("crypto");
const { getIO } = require("../socket/socketManager");
const { SOCKET } = require("../constants/events");
const { recordWatchSession } = require("../utils/watchSession");

const createRoom = async (req, res) => {
  try {
    const { display_name, client_id } = req.body;

    const invite_token = crypto.randomBytes(8).toString("hex");

    const room_code =
      generateRoomCode();

    const participant_id =
      crypto.randomUUID();

    const expires_at = new Date(
      Date.now() +
        24 * 60 * 60 * 1000
    );

    const room =
      await Room.create({
        room_code,
        invite_token,
        host_name: display_name,

        host_participant_id:
          participant_id,

        controller_participant_id:
          participant_id,

        participants: [
          {
            participant_id,
            client_id,
            display_name,
            is_online: true,
            joined_at: new Date(),
          },
        ],

        activity_logs: [
          {
            type: "room_created",
            message: `${display_name} created room`,
          },
        ],

        expires_at,
      });

    res.status(201).json({
      success: true,
      participant_id,
      room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const joinRoom = async (
  req,
  res
) => {
  try {
    const {
      room_code,
      invite_token,
      client_id,
      display_name,
    } = req.body;

    if (
      !display_name ||
      !client_id ||
      (!room_code &&
        !invite_token)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields",
      });
    }

    const query = {
      status: "active",
    };

    if (invite_token) {
      query.invite_token =
        invite_token;
    } else {
      query.room_code =
        room_code;
    }

    const room =
      await Room.findOne(query);

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const existingParticipant =
      room.participants.find(
        (participant) =>
          participant.client_id ===
          client_id
      );

    if (
      existingParticipant
    ) {
      existingParticipant.is_online =
        true;

      existingParticipant.left_at =
        null;

      existingParticipant.display_name =
        display_name.trim();

      room.activity_logs.push({
        type:
          "participant_rejoined",

        message:
          `${display_name} rejoined room`,
      });

      await room.save();

      getIO()?.to(room.invite_token).emit(SOCKET.ROOM_UPDATED, { room });

      return res.json({
        success: true,
        participant_id:
          existingParticipant.participant_id,
        room,
      });
    }

    const participant_id =
      crypto.randomUUID();

    room.participants.push({
      participant_id,

      client_id,

      display_name:
        display_name.trim(),

      is_online: true,

      joined_at:
        new Date(),
    });

    room.activity_logs.push({
      type:
        "participant_joined",

      message:
        `${display_name} joined room`,
    });

    await room.save();

    getIO()?.to(room.invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    return res.json({
      success: true,
      participant_id,
      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

const getRoomByInviteToken = async (req, res) => {
  try {
    const token = req.params.invite_token
    const room = await Room.findOne({
      invite_token : token,
      status: "active",
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found !!!",
      });
    }

    res.status(200).json({
      success: true,
      room
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid invite_token",
    });
  }
};

const getRoomByRoomCode = async (req, res) => {
  try {
    const { room_code } = req.body;
    const room = await Room.findOne({
      room_code,
      status: "active",
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      room
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid room code",
    });
  }
};

const leaveRoom = async (
  req,
  res
) => {
  try {
    const { invite_token, participant_id } = req.body;

    const room =
      await Room.findOne({ invite_token});

    if (!room) {
      return res.status(404).json({
        success: false,
      });
    }

    const participant =
      room.participants.find(
        (p) =>
          p.participant_id ===
          participant_id
      );

    if (!participant) {
      return res.status(404).json({
        success: false,
      });
    }

    participant.is_online  = false;
    participant.left_at    = new Date();
    participant.socket_id  = null; // prevents disconnect handler from double-processing

    room.activity_logs.push({
      type: "participant_left",
      message: `${participant.display_name} left room`,
    });

    if (
      room.controller_participant_id === participant_id &&
      room.host_participant_id !== participant_id
    ) {
      room.controller_participant_id = room.host_participant_id;
      room.activity_logs.push({
        type: "controller_auto_recovered",
        message: "Controller returned to host",
      });
    }

    await room.save();

    // Record watch session (fire-and-forget — non-critical)
    recordWatchSession(room, participant);

    getIO()?.to(room.invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

const rejoinRoom = async (req, res) => {
  try {
    const {
      invite_token,
      client_id,
    } = req.body;

    if (
      !invite_token ||
      !client_id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "invite_token and client_id are required",
      });
    }

    const room =
      await Room.findOne({
        invite_token,
        status: "active",
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found",
      });
    }

    const participant =
      room.participants.find(
        (participant) =>
          participant.client_id ===
          client_id
      );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message:
          "Participant not found",
      });
    }

    participant.is_online =
      true;

    participant.left_at =
      null;

    room.activity_logs.push({
      type:
        "participant_rejoined",

      message:
        `${participant.display_name} rejoined room`,

      created_at:
        new Date(),
    });

    await room.save();

    getIO()?.to(room.invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    return res.json({
      success: true,

      participant_id:
        participant.participant_id,

      participant,

      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

const VALID_CONTENT_TYPES = ["youtube", "local_video"];

const validateContentMetadata = (type, metadata) => {
  if (type === "youtube") {
    const hasMetadata = metadata && Object.keys(metadata).length > 0;
    if (hasMetadata && !metadata.video_id) {
      return "YouTube content requires metadata.video_id";
    }
    // Empty metadata = switching type only (no specific video yet) — allowed
  }
  // local_video metadata is validated in Phase 4.5
  return null;
};

const buildActivityMessage = (type, metadata) => {
  if (type === "youtube" && metadata?.video_id) {
    return `Content source changed to YouTube (${metadata.video_id})`;
  }
  if (type === "local_video" && metadata?.filename) {
    return `Content source changed to Local Video (${metadata.filename})`;
  }
  return `Content source changed to ${type}`;
};

const updateContentSource = async (req, res) => {
  try {
    const { room_code, content_source, participant_id } = req.body;

    if (!room_code || !participant_id || !content_source?.type) {
      return res.status(400).json({
        success: false,
        message: "room_code, participant_id, and content_source.type are required",
      });
    }

    if (!VALID_CONTENT_TYPES.includes(content_source.type)) {
      return res.status(400).json({
        success: false,
        message: `content_source.type must be one of: ${VALID_CONTENT_TYPES.join(", ")}`,
      });
    }

    const metadataError = validateContentMetadata(
      content_source.type,
      content_source.metadata
    );
    if (metadataError) {
      return res.status(400).json({ success: false, message: metadataError });
    }

    const room = await Room.findOne({ room_code, status: "active" });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.controller_participant_id !== participant_id) {
      return res.status(403).json({
        success: false,
        message: "Only the controller can change the content source",
      });
    }

    if (content_source.type === "local_video" && room.settings?.allow_local_video === false) {
      return res.status(403).json({
        success: false,
        message: "Local video is disabled for this room",
      });
    }

    if (content_source.type === "youtube" && room.settings?.allow_youtube === false) {
      return res.status(403).json({
        success: false,
        message: "YouTube is disabled for this room",
      });
    }

    room.content_source = {
      type: content_source.type,
      metadata: content_source.metadata || {},
    };

    // Reset playback state whenever the content source changes.
    room.playback_state = {
      status:       "idle",
      current_time: 0,
      playback_rate: 1,
      duration:     0,
      updated_at:   null,
      updated_by:   null,
    };
    room.markModified("playback_state");

    // Reset all participant ready flags when content changes.
    room.participants.forEach((p) => { p.is_ready = false; });

    room.activity_logs.push({
      type: "content_selected",
      message: buildActivityMessage(content_source.type, content_source.metadata),
    });

    await room.save();

    getIO()?.to(room.invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const transferController = async (req, res) => {
  try {
    const { invite_token, participant_id, target_participant_id } = req.body;

    if (!invite_token || !participant_id || !target_participant_id) {
      return res.status(400).json({
        success: false,
        message: "invite_token, participant_id, and target_participant_id are required",
      });
    }

    const room = await Room.findOne({ invite_token, status: "active" });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.host_participant_id !== participant_id) {
      return res.status(403).json({
        success: false,
        message: "Only the host can transfer the controller role",
      });
    }

    if (room.controller_participant_id === target_participant_id) {
      return res.status(400).json({
        success: false,
        message: "This participant is already the controller",
      });
    }

    const target = room.participants.find(
      (p) => p.participant_id === target_participant_id
    );

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Target participant not found",
      });
    }

    if (!target.is_online) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer controller to an offline participant",
      });
    }

    room.controller_participant_id = target_participant_id;

    room.activity_logs.push({
      type: "controller_transferred",
      message: `Controller transferred to ${target.display_name}`,
    });

    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const endRoom = async (req, res) => {
  try {
    const { invite_token, participant_id } = req.body;

    if (!invite_token || !participant_id) {
      return res.status(400).json({
        success: false,
        message: "invite_token and participant_id are required",
      });
    }

    const room = await Room.findOne({ invite_token, status: "active" });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.host_participant_id !== participant_id) {
      return res.status(403).json({
        success: false,
        message: "Only the host can end the room",
      });
    }

    room.status = "ended";

    room.participants.forEach((p) => {
      p.is_online  = false;
      p.socket_id  = null; // prevents disconnect handler from double-processing
      if (!p.left_at) p.left_at = new Date();
    });

    room.activity_logs.push({
      type: "room_ended",
      message: "Room ended by host",
    });

    await room.save();

    // Record a watch session for every participant who was in the room
    room.participants.forEach((p) => recordWatchSession(room, p));

    getIO()?.to(invite_token).emit(SOCKET.ROOM_ENDED);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const transferHost = async (req, res) => {
  try {
    const { invite_token, participant_id, target_participant_id } = req.body;

    if (!invite_token || !participant_id || !target_participant_id) {
      return res.status(400).json({
        success: false,
        message: "invite_token, participant_id, and target_participant_id are required",
      });
    }

    const room = await Room.findOne({ invite_token, status: "active" });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.host_participant_id !== participant_id) {
      return res.status(403).json({
        success: false,
        message: "Only the host can transfer the host role",
      });
    }

    if (room.host_participant_id === target_participant_id) {
      return res.status(400).json({
        success: false,
        message: "This participant is already the host",
      });
    }

    const target = room.participants.find(
      (p) => p.participant_id === target_participant_id
    );

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Target participant not found",
      });
    }

    if (!target.is_online) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer host role to an offline participant",
      });
    }

    const oldHostWasController =
      room.controller_participant_id === participant_id;

    room.host_participant_id = target_participant_id;
    room.host_name = target.display_name;

    if (oldHostWasController) {
      room.controller_participant_id = target_participant_id;
    }

    room.activity_logs.push({
      type: "host_transferred",
      message: `Host role transferred to ${target.display_name}`,
    });

    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markReady = async (req, res) => {
  try {
    const { invite_token, participant_id } = req.body;

    if (!invite_token || !participant_id) {
      return res.status(400).json({
        success: false,
        message: "invite_token and participant_id are required",
      });
    }

    const room = await Room.findOne({ invite_token, status: "active" });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const participant = room.participants.find(
      (p) => p.participant_id === participant_id
    );
    if (!participant) {
      return res.status(404).json({ success: false, message: "Participant not found" });
    }

    participant.is_ready = req.body.is_ready !== false; // defaults to true
    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const ALLOWED_SETTINGS = [
  "allow_chat",
  "allow_emoji_reactions",
  "require_everyone_ready",
  "allow_controller_requests",
  "allow_local_video",
  "allow_youtube",
];

const kickParticipant = async (req, res) => {
  try {
    const { invite_token, participant_id, target_participant_id } = req.body;

    if (!invite_token || !participant_id || !target_participant_id) {
      return res.status(400).json({ success: false, message: "invite_token, participant_id, and target_participant_id are required" });
    }

    const room = await Room.findOne({ invite_token, status: "active" });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (room.host_participant_id !== participant_id) {
      return res.status(403).json({ success: false, message: "Only the host can kick participants" });
    }

    if (target_participant_id === participant_id) {
      return res.status(400).json({ success: false, message: "You cannot kick yourself" });
    }

    const target = room.participants.find((p) => p.participant_id === target_participant_id);
    if (!target) return res.status(404).json({ success: false, message: "Participant not found" });

    const targetSocketId = target.socket_id;

    target.is_online   = false;
    target.left_at     = new Date();
    target.socket_id   = null;
    target.hand_raised = false;

    // Auto-recover controller if kicked participant was controller
    if (room.controller_participant_id === target_participant_id) {
      room.controller_participant_id = room.host_participant_id;
      room.activity_logs.push({ type: "controller_auto_recovered", message: "Controller returned to host" });
    }

    room.activity_logs.push({ type: "participant_kicked", message: `${target.display_name} was removed from the room` });
    await room.save();

    // Notify kicked user to leave
    if (targetSocketId) {
      const io = getIO();
      const targetSocket = io?.sockets?.sockets?.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("participant:kicked", { message: "You have been removed from the room by the host." });
        targetSocket.leave(invite_token);
      }
    }

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const muteParticipant = async (req, res) => {
  try {
    const { invite_token, participant_id, target_participant_id, muted } = req.body;

    if (!invite_token || !participant_id || !target_participant_id || typeof muted !== "boolean") {
      return res.status(400).json({ success: false, message: "invite_token, participant_id, target_participant_id, and muted (boolean) are required" });
    }

    const room = await Room.findOne({ invite_token, status: "active" });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (room.host_participant_id !== participant_id) {
      return res.status(403).json({ success: false, message: "Only the host can mute participants" });
    }

    const target = room.participants.find((p) => p.participant_id === target_participant_id);
    if (!target) return res.status(404).json({ success: false, message: "Participant not found" });

    target.is_muted = muted;
    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const raiseHand = async (req, res) => {
  try {
    const { invite_token, participant_id, raised } = req.body;

    if (!invite_token || !participant_id || typeof raised !== "boolean") {
      return res.status(400).json({ success: false, message: "invite_token, participant_id, and raised (boolean) are required" });
    }

    const room = await Room.findOne({ invite_token, status: "active" });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    const participant = room.participants.find((p) => p.participant_id === participant_id);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });

    participant.hand_raised = raised;
    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRoomSettings = async (req, res) => {
  try {
    const { invite_token, participant_id, settings } = req.body;

    if (!invite_token || !participant_id || !settings) {
      return res.status(400).json({ success: false, message: "invite_token, participant_id, and settings are required" });
    }

    const room = await Room.findOne({ invite_token, status: "active" });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (room.host_participant_id !== participant_id) {
      return res.status(403).json({ success: false, message: "Only the host can change room settings" });
    }

    // Only allow whitelisted boolean keys
    ALLOWED_SETTINGS.forEach((key) => {
      if (typeof settings[key] === "boolean") {
        room.settings[key] = settings[key];
      }
    });

    room.markModified("settings");
    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true, settings: room.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRoomStats = async (req, res) => {
  try {
    const activeRooms = await Room.countDocuments({ status: "active" });
    res.json({ success: true, activeRooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyRooms = async (req, res) => {
  try {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ success: false, message: "client_id required" });
    }

    const now = new Date();
    const rooms = await Room.find({
      status:     "active",          // ended / expired rooms are never shown
      expires_at: { $gt: now },      // exclude rooms past their 24h expiry window
      "participants.client_id": client_id,
    })
      .sort({ updated_at: -1 })
      .limit(6)
      .select("room_name room_code invite_token host_name host_participant_id participants created_at updated_at");

    const result = rooms.map((room) => {
      const participant = room.participants.find((p) => p.client_id === client_id);
      const onlineCount = room.participants.filter((p) => p.is_online).length;
      return {
        room_name:      room.room_name,
        room_code:      room.room_code,
        invite_token:   room.invite_token,
        host_name:      room.host_name,
        is_host:        room.host_participant_id === participant?.participant_id,
        participant_id: participant?.participant_id,
        display_name:   participant?.display_name,
        online_count:   onlineCount,
        total_count:    room.participants.length,
        created_at:     room.created_at,
      };
    });

    res.json({ success: true, rooms: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWatchHistory = async (req, res) => {
  try {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ success: false, message: "client_id required" });
    }

    const sessions = await WatchSession
      .find({ client_id })
      .sort({ ended_at: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  updateContentSource,
  markReady,
  getRoomByInviteToken,
  getRoomByRoomCode,
  rejoinRoom,
  endRoom,
  transferController,
  transferHost,
  kickParticipant,
  muteParticipant,
  raiseHand,
  updateRoomSettings,
  getRoomStats,
  getMyRooms,
  getWatchHistory,
};