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

        // Host-enforced mute lock — distinct from is_muted, which is the
        // self-service mic state. See voice:toggle-mic handler.
        muted_by_host: {
          type: Boolean,
          default: false,
        },

        in_voice_call: {
          type: Boolean,
          default: false,
        },

        in_video_call: {
          type: Boolean,
          default: false,
        },

        mic_on: {
          type: Boolean,
          default: false,
        },

        cam_on: {
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
      // New, parallel "host uploads once, everyone streams from the server"
      // mode — kept independent of allow_local_video (the old per-participant
      // synced-file mode) so both can be toggled separately while both exist.
      allow_streamed_video:      { type: Boolean, default: true  },
    },

    status: {
      type: String,
      enum: ["active", "ended", "expired"],
      default: "active",
    },

    expires_at: Date,

    // Last genuine human activity (join, leave, playback, chat, source change).
    // Distinct from the automatic `updated_at` timestamp, which also moves for
    // background writes like heartbeat-driven saves and so can't be used to
    // decide whether a room is actually in use.
    last_active_at: {
      type: Date,
      default: Date.now,
    },

    // Set when the lifecycle sweep expires a room; the room is hard-deleted
    // (with its uploads) once this is older than the retention window.
    expired_at: Date,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Supports the lifecycle sweep's two queries: find active rooms to expire, and
// find expired rooms old enough to purge.
roomSchema.index({ status: 1, last_active_at: 1 });
roomSchema.index({ status: 1, expired_at: 1 });

/**
 * Keep `last_active_at` current.
 *
 * Done here rather than at each call site because every persisted room change
 * already corresponds to real activity — join, leave, playback, chat, calls,
 * settings. Notably the playback heartbeat does *not* save (it only reads and
 * emits a correction), so this can't be kept alive by background traffic.
 */
roomSchema.pre('save', function bumpLastActive(next) {
  // A status change is the lifecycle sweep retiring the room; refreshing the
  // timestamp there would undo the very inactivity it just acted on.
  if (!this.isNew && !this.isModified('status')) {
    this.last_active_at = new Date();
  }
  next();
});

module.exports = mongoose.model(
  "Room",
  roomSchema
);