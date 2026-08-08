'use strict';

const fsp = require('fs').promises;
const path = require('path');

const Room = require('../models/roomModel');
const Message = require('../models/messageModel');
const WatchSession = require('../models/watchSessionModel');
const config = require('../config');
const { getIO } = require('../socket/socketManager');
const { SOCKET } = require('../constants/events');
const { deleteRoomUploads, deleteAllUploads } = require('../utils/videoStorage');
const { runSweep } = require('../utils/roomLifecycle');
const { createLogger } = require('../utils/logger');

const log = createLogger('adminController');

const onlineCount = (room) =>
  (room.participants || []).filter((p) => p.is_online).length;

// Recursive byte total for a room's upload directory.
const dirSize = async (dir) => {
  let total = 0;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(full);
    else {
      const st = await fsp.stat(full).catch(() => null);
      if (st) total += st.size;
    }
  }
  return total;
};

/** Aggregate counts for the dashboard header. */
const getStats = async (_req, res) => {
  try {
    const [byStatus, rooms, messageCount, watchSessionCount] = await Promise.all([
      Room.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Room.find({ status: 'active' }).select('participants playback_state content_source').lean(),
      Message.countDocuments(),
      WatchSession.countDocuments(),
    ]);

    const statusCounts = byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

    const occupied = rooms.filter((r) => (r.participants || []).some((p) => p.is_online));
    const playing = rooms.filter((r) => r.playback_state?.status === 'playing');

    // Storage is measured from disk rather than from room metadata, so files
    // left behind by rooms that have since changed source still show up.
    let uploadsBytes = 0;
    let uploadDirs = 0;
    try {
      const entries = await fsp.readdir(config.uploads.dir, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory());
      uploadDirs = dirs.length;
      const sizes = await Promise.all(
        dirs.map((d) => dirSize(path.join(config.uploads.dir, d.name)))
      );
      uploadsBytes = sizes.reduce((a, b) => a + b, 0);
    } catch { /* uploads dir is created lazily on first upload */ }

    res.json({
      success: true,
      stats: {
        rooms: {
          total:    Object.values(statusCounts).reduce((a, b) => a + b, 0),
          active:   statusCounts.active  || 0,
          expired:  statusCounts.expired || 0,
          ended:    statusCounts.ended   || 0,
          occupied: occupied.length,
          empty:    rooms.length - occupied.length,
        },
        playback: {
          playing: playing.length,
          bySource: playing.reduce((acc, r) => {
            const t = r.content_source?.type || 'none';
            return { ...acc, [t]: (acc[t] || 0) + 1 };
          }, {}),
        },
        storage: { uploadDirs, uploadsBytes },
        // Orphan counts: rows in these collections should always be 0 once no
        // room references them (they're keyed by invite_token, not a Mongo
        // ref, so they don't cascade automatically — see purgeOrphanedRecords).
        records: { messages: messageCount, watchSessions: watchSessionCount },
        cleanup: {
          dryRun:        config.lifecycle.dryRun,
          emptyGraceMs:  config.lifecycle.emptyGraceMs,
          maxIdleMs:     config.lifecycle.maxIdleMs,
          retentionMs:   config.lifecycle.retentionMs,
        },
      },
    });
  } catch (err) {
    log.error('getStats', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Room list with the detail needed to decide what to delete. */
const listRooms = async (req, res) => {
  try {
    const { status, q, limit = 100 } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (q) {
      filter.$or = [
        { room_code: new RegExp(String(q).trim(), 'i') },
        { room_name: new RegExp(String(q).trim(), 'i') },
        { host_name: new RegExp(String(q).trim(), 'i') },
      ];
    }

    const rooms = await Room.find(filter)
      .sort({ last_active_at: -1, created_at: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
      .select('room_code room_name host_name invite_token status participants playback_state content_source created_at last_active_at expires_at expired_at')
      .lean();

    const withSizes = await Promise.all(
      rooms.map(async (r) => {
        const meta = r.content_source?.metadata || {};
        const isStreamed = r.content_source?.type === 'streamed_local_video';
        return {
          room_code:     r.room_code,
          room_name:     r.room_name,
          host_name:     r.host_name,
          invite_token:  r.invite_token,
          status:        r.status,
          participants:  (r.participants || []).length,
          online:        onlineCount(r),
          playback:      r.playback_state?.status || 'idle',
          content_type:  r.content_source?.type || null,
          content_label: isStreamed ? (meta.original_name || null)
                        : r.content_source?.type === 'youtube' ? (meta.video_id || null)
                        : meta.filename || null,
          created_at:      r.created_at,
          last_active_at:  r.last_active_at,
          // Measured from disk, so a room that uploaded a video and then
          // switched source still reports the space it is holding.
          upload_bytes: await dirSize(path.join(config.uploads.dir, r.invite_token)),
        };
      })
    );

    res.json({ success: true, count: withSizes.length, rooms: withSizes });
  } catch (err) {
    log.error('listRooms', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

// Deletes a single room's uploads, chat, watch history and document. Shared
// by deleteRoom and bulkDeleteRooms so the two paths can't drift apart.
//
// WatchSession is intentionally its own collection (keyed by client_id, not
// invite_token — it's a per-user "what did I watch" record meant to outlive
// a room in the ordinary lifecycle-expiry case). But an *admin* delete is a
// deliberate "erase this room" action, so here it cascades: leaving orphaned
// history rows pointing at a room that no longer exists would just be
// confusing, not useful.
const deleteRoomFully = async (room) => {
  getIO()?.to(room.invite_token).emit(SOCKET.ROOM_ENDED);
  await deleteRoomUploads(room.invite_token);
  await Message.deleteMany({ invite_token: room.invite_token });
  await WatchSession.deleteMany({ invite_token: room.invite_token });
  await Room.deleteOne({ _id: room._id });
};

/** Delete a room outright, plus its chat messages and uploaded files. */
const deleteRoom = async (req, res) => {
  try {
    const { invite_token } = req.params;

    const room = await Room.findOne({ invite_token }).select('invite_token room_code status');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await deleteRoomFully(room);

    log.info('Admin deleted room', { room_code: room.room_code, invite_token });
    res.json({ success: true, deleted: { room_code: room.room_code, invite_token } });
  } catch (err) {
    log.error('deleteRoom', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

// The category vocabulary the admin UI's bulk-delete buttons offer. Each maps
// to a Mongo filter; 'active_empty' is the odd one out because "empty" isn't
// a status value — it's active rooms with nobody currently online, which is
// exactly the set the lifecycle sweep would eventually expire on its own.
const BULK_CATEGORY_FILTERS = {
  expired:     { status: 'expired' },
  ended:       { status: 'ended' },
  active_empty: { status: 'active', 'participants.is_online': { $ne: true } },
};

/**
 * Bulk delete every room in a status category. This is the highest-blast-radius
 * admin action (many rooms and their video files in one call), so unlike
 * single-room delete it requires the caller to echo back the exact count it
 * was shown — cheap insurance against a stale UI or a fat-fingered click
 * deleting far more than intended.
 */
const bulkDeleteRooms = async (req, res) => {
  try {
    const { category, expected_count } = req.body;

    const filter = BULK_CATEGORY_FILTERS[category];
    if (!filter) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${Object.keys(BULK_CATEGORY_FILTERS).join(', ')}`,
      });
    }

    const rooms = await Room.find(filter).select('invite_token room_code');

    if (typeof expected_count === 'number' && expected_count !== rooms.length) {
      return res.status(409).json({
        success: false,
        message: `Room count changed (expected ${expected_count}, found ${rooms.length}) — refresh and try again`,
        actual_count: rooms.length,
      });
    }

    const results = await Promise.allSettled(rooms.map((r) => deleteRoomFully(r)));
    const deleted = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') deleted.push(rooms[i].room_code);
      else failed.push({ room_code: rooms[i].room_code, error: r.reason?.message });
    });

    if (failed.length) {
      log.error('bulkDeleteRooms partial failure', { category, failed });
    }
    log.info('Admin bulk-deleted rooms', { category, deleted: deleted.length, failed: failed.length });

    res.json({ success: true, deleted_count: deleted.length, failed_count: failed.length, failed });
  } catch (err) {
    log.error('bulkDeleteRooms', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Clear a room's content (video/source) without deleting the room itself. */
const deleteRoomContent = async (req, res) => {
  try {
    const { invite_token } = req.params;

    const room = await Room.findOne({ invite_token });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await deleteRoomUploads(invite_token);

    room.content_source = null;
    room.playback_state = {
      status: 'idle', current_time: 0, playback_rate: 1,
      duration: 0, updated_at: null, updated_by: null,
    };
    room.markModified('playback_state');
    room.participants.forEach((p) => { p.is_ready = false; });
    room.activity_logs.push({
      type: 'content_cleared',
      message: 'Content removed by administrator',
    });

    await room.save();

    getIO()?.to(invite_token).emit(SOCKET.ROOM_UPDATED, { room });

    log.info('Admin cleared room content', { room_code: room.room_code, invite_token });
    res.json({ success: true });
  } catch (err) {
    log.error('deleteRoomContent', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const PURGE_CONFIRMATION = 'DELETE_ALL_ROOMS_AND_UPLOADS';

/**
 * Permanently delete every room and every uploaded video from this server.
 * The confirmation value makes this endpoint difficult to trigger by accident;
 * authentication is still enforced for the whole admin router.
 */
const purgeAllRoomsAndUploads = async (req, res) => {
  try {
    if (req.body?.confirmation !== PURGE_CONFIRMATION) {
      return res.status(400).json({
        success: false,
        message: `Set confirmation to ${PURGE_CONFIRMATION} to permanently delete all rooms and uploads`,
      });
    }

    const rooms = await Room.find({}).select('_id invite_token room_code');
    rooms.forEach((room) => getIO()?.to(room.invite_token).emit(SOCKET.ROOM_ENDED));

    // Delete the upload root as well as room documents. This catches orphaned
    // video directories and partial uploads that are not associated with a room.
    const [roomResult, messageResult, watchSessionResult] = await Promise.all([
      Room.deleteMany({}),
      Message.deleteMany({}),
      WatchSession.deleteMany({}),
      deleteAllUploads(),
    ]);

    log.warn('Admin purged all rooms and uploads', {
      rooms: roomResult.deletedCount,
      messages: messageResult.deletedCount,
      watchSessions: watchSessionResult.deletedCount,
    });

    return res.json({
      success: true,
      deleted: {
        rooms: roomResult.deletedCount,
        messages: messageResult.deletedCount,
        watch_sessions: watchSessionResult.deletedCount,
        uploads: 'all',
      },
    });
  } catch (err) {
    log.error('purgeAllRoomsAndUploads', { error: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** Run the lifecycle sweep on demand. Honours ROOM_CLEANUP_DRY_RUN. */
const runCleanup = async (_req, res) => {
  try {
    const result = await runSweep();
    res.json({ success: true, dryRun: config.lifecycle.dryRun, result });
  } catch (err) {
    log.error('runCleanup', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getStats,
  listRooms,
  deleteRoom,
  bulkDeleteRooms,
  deleteRoomContent,
  purgeAllRoomsAndUploads,
  runCleanup,
};
