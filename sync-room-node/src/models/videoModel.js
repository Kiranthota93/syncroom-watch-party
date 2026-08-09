'use strict';

const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    video_key: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    original_name: String,
    content_hash: {
      type: String,
      required: true,
      unique: true,
    },
    storage_path: {
      type: String,
      required: true,
    },
    mime_type: {
      type: String,
      default: 'video/mp4',
    },
    size_bytes: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    last_used_at: {
      type: Date,
      default: Date.now,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

videoSchema.index({ video_key: 1 });
videoSchema.index({ content_hash: 1 });

module.exports = mongoose.model('Video', videoSchema);
