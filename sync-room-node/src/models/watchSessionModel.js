const mongoose = require("mongoose");

const watchSessionSchema = new mongoose.Schema(
  {
    client_id:        { type: String, required: true, index: true },
    display_name:     { type: String },
    invite_token:     { type: String },
    room_name:        { type: String },
    content_type:     { type: String, default: null }, // 'youtube' | 'local_video' | null
    content_title:    { type: String, default: null },
    content_url:      { type: String, default: null }, // YouTube URL or null
    started_at:       { type: Date },
    ended_at:         { type: Date, default: Date.now },
    duration_s:       { type: Number, default: 0 },    // seconds in room
    participant_count: { type: Number, default: 1 },
  },
  { timestamps: false }
);

// Auto-delete after 30 days
watchSessionSchema.index({ ended_at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model("WatchSession", watchSessionSchema);
