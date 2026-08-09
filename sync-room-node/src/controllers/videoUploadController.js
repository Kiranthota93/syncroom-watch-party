'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const Room = require('../models/roomModel');
const config = require('../config');
const { getIO } = require('../socket/socketManager');
const { SOCKET } = require('../constants/events');
const { createLogger } = require('../utils/logger');
const {
  tmpDir,
  ensureDir,
  hasEnoughFreeSpace,
  finalizeUpload,
  createVideoReadStream,
} = require('../utils/videoStorage');

const log = createLogger('videoUploadController');

// New, parallel content source — see roomModel.js `settings.allow_streamed_video`.
// Kept entirely separate from the existing "local_video" (per-participant-file) path.

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const { invite_token } = req.params;
      const { upload_id } = req.body;
      const dir = tmpDir(invite_token, upload_id);
      await ensureDir(dir);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, _file, cb) => {
    cb(null, String(req.body.chunk_index));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSizeBytes },
});

const uploadChunkMiddleware = upload.single('chunk');

// Only the room's current controller may drive an upload — same authority
// model as the existing content-source switch.
const requireController = async (invite_token, participant_id) => {
  const room = await Room.findOne({ invite_token, status: 'active' });
  if (!room) return { error: { status: 404, message: 'Room not found' } };
  if (room.controller_participant_id !== participant_id) {
    return { error: { status: 403, message: 'Only the controller can upload video' } };
  }
  if (room.settings?.allow_streamed_video === false) {
    return { error: { status: 403, message: 'Video upload is disabled for this room' } };
  }
  return { room };
};

const initUpload = async (req, res) => {
  try {
    const { invite_token } = req.params;
    const { participant_id, original_name, mime_type, size_bytes, total_chunks } = req.body;

    if (!participant_id || !original_name || !size_bytes || !total_chunks) {
      return res.status(400).json({
        success: false,
        message: 'participant_id, original_name, size_bytes, and total_chunks are required',
      });
    }

    const { room, error } = await requireController(invite_token, participant_id);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (size_bytes > config.uploads.maxFileSizeBytes) {
      return res.status(413).json({
        success: false,
        message: `File exceeds the ${Math.round(config.uploads.maxFileSizeBytes / 1024 / 1024)}MB limit`,
      });
    }

    if (!(await hasEnoughFreeSpace(size_bytes))) {
      return res.status(507).json({ success: false, message: 'Server storage is full — try again later' });
    }

    const upload_id = crypto.randomUUID();
    const ext = path.extname(original_name) || '.mp4';

    room.content_source = {
      type: 'streamed_local_video',
      metadata: {
        file_id: upload_id,
        ext,
        original_name,
        mime_type: mime_type || 'video/mp4',
        size_bytes,
        status: 'uploading',
        uploaded_at: null,
      },
    };

    room.playback_state = {
      status: 'idle',
      current_time: 0,
      playback_rate: 1,
      duration: 0,
      updated_at: null,
      updated_by: null,
    };
    room.markModified('playback_state');
    room.participants.forEach((p) => { p.is_ready = false; });

    room.activity_logs.push({
      type: 'content_selected',
      message: `Content source changed to streamed video (${original_name})`,
    });

    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true, upload_id });
  } catch (err) {
    log.error('initUpload', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const uploadChunk = async (req, res) => {
  try {
    const { invite_token } = req.params;
    const { upload_id, chunk_index, total_chunks, participant_id } = req.body;

    if (!upload_id || chunk_index === undefined || !total_chunks || !participant_id) {
      return res.status(400).json({
        success: false,
        message: 'upload_id, chunk_index, total_chunks, and participant_id are required',
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Missing chunk file' });
    }

    const room = await Room.findOne({ invite_token, status: 'active' });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.controller_participant_id !== participant_id) {
      return res.status(403).json({ success: false, message: 'Only the controller can upload video' });
    }
    if (room.content_source?.metadata?.file_id !== upload_id) {
      return res.status(409).json({ success: false, message: 'Upload session no longer matches room content' });
    }

    const idx = Number(chunk_index);
    const total = Number(total_chunks);
    const isLastChunk = idx === total - 1;

    if (!isLastChunk) {
      // Ephemeral progress relay — no DB write per chunk, mirrors the
      // reaction:send/chat:typing convention elsewhere in this codebase.
      getIO()?.to(invite_token).emit(SOCKET.CONTENT_UPLOAD_PROGRESS, {
        upload_id,
        chunk_index: idx,
        total_chunks: total,
      });
      return res.status(200).json({ success: true });
    }

    const { file_id, ext } = room.content_source.metadata;
    const finalFilePath = await finalizeUpload(invite_token, upload_id, file_id, ext, total);

    room.content_source.metadata.status = 'ready';
    room.content_source.metadata.path = finalFilePath;
    room.content_source.metadata.uploaded_at = new Date();
    room.markModified('content_source');

    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    res.status(200).json({ success: true, done: true });
  } catch (err) {
    log.error('uploadChunk', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

// HTTP Range Request streaming — what viewers' <video src> points at directly.
const streamVideo = async (req, res) => {
  try {
    const { invite_token, file_id } = req.params;

    const room = await Room.findOne({ invite_token, status: 'active' });
    if (!room) return res.status(404).end();

    const meta = room.content_source?.metadata;
    if (!meta || meta.file_id !== file_id || meta.status !== 'ready' || !meta.path) {
      return res.status(404).end();
    }

    const stat = await fs.promises.stat(meta.path).catch(() => null);
    if (!stat) return res.status(404).end();

    const range = req.headers.range;
    const mimeType = meta.mime_type || 'video/mp4';

    if (!range) {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      createVideoReadStream(meta.path).pipe(res);
      return;
    }

    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

    if (Number.isNaN(start) || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': mimeType,
    });
    createVideoReadStream(meta.path, { start, end }).pipe(res);
  } catch (err) {
    log.error('streamVideo', { error: err.message });
    res.status(500).end();
  }
};

module.exports = {
  uploadChunkMiddleware,
  initUpload,
  uploadChunk,
  streamVideo,
};
