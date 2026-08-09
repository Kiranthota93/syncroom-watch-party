'use strict';

const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    video_keys: [String],
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    owner_id: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

playlistSchema.index({ visibility: 1 });

module.exports = mongoose.model('Playlist', playlistSchema);
