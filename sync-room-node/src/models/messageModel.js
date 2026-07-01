const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    invite_token:   { type: String, required: true, index: true },
    participant_id: { type: String },
    display_name:   { type: String },
    message:        { type: String, required: true },
    type:           { type: String, enum: ["text", "system"], default: "text" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

// Auto-delete messages 48h after room activity (TTL index on created_at)
messageSchema.index({ created_at: 1 }, { expireAfterSeconds: 172800 });

module.exports = mongoose.model("Message", messageSchema);
