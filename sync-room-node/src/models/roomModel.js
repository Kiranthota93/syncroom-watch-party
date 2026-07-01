const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    room_code: {
      type: String,
      required: true,
      unique: true,
    },

    invite_token: {
      type: String,
      required: true,
      unique: true,
    },

    room_name: {
      type: String,
      default: "Movie Night",
    },

    host_name: {
      type: String,
      required: true,
    },

    host_participant_id: {
      type: String,
      required: true,
    },

    controller_participant_id: {
      type: String,
    },
    participants: [
      {
        participant_id: String,

        client_id: {
          type: String,
          required: true,
        },

        display_name: String,

        joined_at: {
          type: Date,
          default: Date.now,
        },

        left_at: Date,

        is_online: {
          type: Boolean,
          default: true,
        },

        is_ready: {
          type: Boolean,
          default: false,
        },

        hand_raised: {
          type: Boolean,
          default: false,
        },

        is_muted: {
          type: Boolean,
          default: false,
        },

        socket_id: String,
      },
    ],
    activity_logs: [
      {
        type: {
          type: String,
        },

        message: String,

        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    content_source: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    playback_state: {
      status: {
        type: String,
        enum: ["idle", "playing", "paused", "ended"],
        default: "idle",
      },
      current_time: {
        type: Number,
        default: 0,
      },
      playback_rate: {
        type: Number,
        default: 1,
      },
      duration: {
        type: Number,
        default: 0,
      },
      updated_at: {
        type: Date,
        default: null,
      },
      updated_by: {
        type: String,
        default: null,
      },
    },

    settings: {
      allow_chat:                { type: Boolean, default: true  },
      allow_emoji_reactions:     { type: Boolean, default: true  },
      require_everyone_ready:    { type: Boolean, default: false },
      allow_controller_requests: { type: Boolean, default: true  },
      allow_local_video:         { type: Boolean, default: true  },
      allow_youtube:             { type: Boolean, default: true  },
    },

    status: {
      type: String,
      enum: ["active", "ended", "expired"],
      default: "active",
    },

    expires_at: Date,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model(
  "Room",
  roomSchema
);