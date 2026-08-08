'use strict';

const fsp = require('fs').promises;
const path = require('path');

const Room = require('../models/roomModel');
const Message = require('../models/messageModel');
const WatchSession = require('../models/watchSessionModel');
const config = require('../config');
const { getIO } = require('../socket/socketManager');
const { SOCKET } = require('../constants/events');
const { deleteRoomUploads } = require('./videoStorage');
const { createLogger } = require('./logger');

const log = createLogger('roomLifecycle');

/**
 * Room + uploaded-content lifecycle.
 *
 * Rooms are created with a 24h `expires_at`, but nothing ever acted on it, so
 * every room stayed status:"active" indefinitely — cluttering listings, staying
 * joinable via old invite links, and (for streamed uploads) holding disk space
 * forever. This runs the two-stage lifecycle:
 *
 *   active ──expire──> expired ──purge──> deleted (+ uploads removed)
 *
 * Expiry is based on real inactivity, not just age: a room with people actually
 * in it is never expired by the empty/all-offline rule.
 */

const isRoomOccupied = (room) =>
  (room.participants || []).some((p) => p.is_online);

/**
 * Stage 1 — expire active rooms that are empty, all-offline, or long idle.
 * Never deletes here, so a mistake is recoverable within the retention window.
 */
const expireInactiveRooms = async () => {
  const now = Date.now();
  const emptyCutoff = new Date(now - config.lifecycle.emptyGraceMs);
  const idleCutoff = new Date(now - config.lifecycle.maxIdleMs);

  // One-time backfill for rooms created before `last_active_at` existed.
  // Necessary because Mongoose applies the schema default when *hydrating* a
  // document that lacks the field, so a legacy room would load as if it had
  // just been active and could never be expired. Writing the real value from
  // updated_at/created_at fixes that permanently and is idempotent.
  const backfill = await Room.collection.updateMany(
    { last_active_at: { $exists: false } },
    [{ $set: { last_active_at: { $ifNull: ['$updated_at', '$created_at'] } } }]
  );
  if (backfill.modifiedCount) {
    log.info('Backfilled last_active_at on legacy rooms', { count: backfill.modifiedCount });
  }

  // Only rooms that are already inactive by *some* measure are candidates; the
  // occupancy check below is what actually decides. Fetching only these keeps
  // the sweep cheap on a large collection.
  //
  // `last_active_at: { $exists: false }` matters for rooms created before this
  // field existed: Mongo's $lt does not match a missing field, so without this
  // every pre-existing room would be invisible to the sweep forever — which is
  // exactly the backlog of days-old "active" rooms this is meant to clear.
  const candidates = await Room.find({
    status: 'active',
    $or: [
      { last_active_at: { $lt: emptyCutoff } },
      { last_active_at: { $exists: false } },
      { expires_at: { $lt: new Date(now) } },
    ],
  }).select('invite_token room_code participants last_active_at expires_at created_at updated_at');

  const expired = [];

  for (const room of candidates) {
    // Fall back through updated_at → created_at for legacy documents.
    const lastActive = (room.last_active_at ?? room.updated_at ?? room.created_at)?.getTime() ?? 0;
    const occupied = isRoomOccupied(room);

    // An occupied room only expires on the hard idle ceiling — never on the
    // empty-room grace period, however stale its last activity looks.
    const reason = occupied
      ? (lastActive < idleCutoff.getTime() ? 'max_idle' : null)
      : (lastActive < emptyCutoff.getTime() ? 'empty' : null);

    if (!reason) continue;

    const stamp = new Date();

    // Atomic update rather than load-modify-save: it avoids pulling each room's
    // activity_logs array (which grows with every action in the room) just to
    // append one entry, and the status guard makes it a no-op if the room came
    // back to life between the query above and this write.
    const res = await Room.updateOne(
      { _id: room._id, status: 'active' },
      {
        $set: {
          status: 'expired',
          expired_at: stamp,
          'participants.$[].is_online': false,
          'participants.$[].socket_id': null,
          'participants.$[stillIn].left_at': stamp,
        },
        $push: {
          activity_logs: {
            type: 'room_expired',
            message: reason === 'empty'
              ? 'Room closed automatically — everyone had left'
              : 'Room closed automatically — inactive too long',
            created_at: stamp,
          },
        },
      },
      { arrayFilters: [{ 'stillIn.left_at': null }] }
    );

    if (!res.modifiedCount) continue;
    expired.push({ invite_token: room.invite_token, reason });

    // Kick any socket still holding the room open (e.g. a background tab).
    getIO()?.to(room.invite_token).emit(SOCKET.ROOM_ENDED);
  }

  if (expired.length) {
    log.info('Expired inactive rooms', {
      count: expired.length,
      empty: expired.filter((r) => r.reason === 'empty').length,
      maxIdle: expired.filter((r) => r.reason === 'max_idle').length,
    });
  }

  return expired.length;
};

/**
 * Stage 2 — hard-delete expired/ended rooms past the retention window, removing
 * their uploads first so a failed delete can be retried on the next sweep
 * rather than orphaning files.
 */
const purgeRetiredRooms = async () => {
  const cutoff = new Date(Date.now() - config.lifecycle.retentionMs);

  const rooms = await Room.find({
    status: { $in: ['expired', 'ended'] },
    $or: [
      { expired_at: { $lt: cutoff } },
      // Rooms ended before expired_at existed, or ended by the host (which sets
      // status but not expired_at) — fall back to the document's own mtime.
      { expired_at: null, updated_at: { $lt: cutoff } },
    ],
  }).select('invite_token room_code');

  if (config.lifecycle.dryRun) {
    if (rooms.length) {
      log.warn('DRY RUN — would purge retired rooms (set ROOM_CLEANUP_DRY_RUN=false to apply)', {
        count: rooms.length,
        room_codes: rooms.map((r) => r.room_code).slice(0, 20),
      });
    }
    return 0;
  }

  let purged = 0;

  for (const room of rooms) {
    try {
      // Uploads first: if this throws we keep the Room document, so the next
      // sweep retries. Deleting the document first would strand the files.
      await deleteRoomUploads(room.invite_token);
      // Chat and watch history are separate collections keyed by invite_token
      // rather than a Mongo reference, so deleting the Room doesn't cascade to
      // them automatically — without this they were left behind permanently
      // (Message has no TTL of its own; WatchSession's 30-day TTL means it
      // would eventually self-clean, but there's no reason to wait on that
      // once the room itself is gone).
      await Message.deleteMany({ invite_token: room.invite_token });
      await WatchSession.deleteMany({ invite_token: room.invite_token });
      await Room.deleteOne({ _id: room._id });
      purged += 1;
    } catch (err) {
      log.error('purge failed for room', {
        invite_token: room.invite_token,
        error: err.message,
      });
    }
  }

  if (purged) log.info('Purged retired rooms', { count: purged });
  return purged;
};

/**
 * Stage 3 — delete upload directories with no corresponding room at all.
 *
 * The previous sweep only matched rooms whose content_source.type was still
 * 'streamed_local_video', so switching a room's source after uploading (which
 * overwrites content_source) orphaned that room's files permanently. Sweeping
 * the directory against the room collection catches those, plus anything left
 * behind by a crash mid-purge.
 */
const purgeOrphanedUploads = async () => {
  let entries;
  try {
    entries = await fsp.readdir(config.uploads.dir, { withFileTypes: true });
  } catch (err) {
    // Nothing uploaded yet — the directory is created lazily on first upload.
    if (err.code === 'ENOENT') return 0;
    throw err;
  }

  const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (!dirNames.length) return 0;

  const live = await Room.find({ invite_token: { $in: dirNames } }).select('invite_token');
  const liveTokens = new Set(live.map((r) => r.invite_token));

  const orphans = dirNames.filter((name) => !liveTokens.has(name));
  if (!orphans.length) return 0;

  if (config.lifecycle.dryRun) {
    log.warn('DRY RUN — would remove orphaned upload dirs (set ROOM_CLEANUP_DRY_RUN=false to apply)', {
      count: orphans.length,
      dirs: orphans.slice(0, 20),
    });
    return 0;
  }

  let removed = 0;
  for (const name of orphans) {
    try {
      await fsp.rm(path.join(config.uploads.dir, name), { recursive: true, force: true });
      removed += 1;
    } catch (err) {
      log.error('orphan cleanup failed', { dir: name, error: err.message });
    }
  }

  if (removed) log.info('Removed orphaned upload directories', { count: removed });
  return removed;
};

/**
 * Stage 4 — delete Message/WatchSession rows whose invite_token matches no
 * Room at all.
 *
 * Both collections are keyed by invite_token rather than a Mongo reference, so
 * deleting a Room never cascaded to them automatically — every past room
 * deletion (including admin deletes, before deleteRoomFully started cascading,
 * and every purge before this stage existed) left these behind permanently
 * for Message, which has no TTL of its own.
 *
 * Unlike the other purge stages this does not honour dryRun: an orphaned row
 * references a room that is unconditionally gone, so there is no "might still
 * be wanted" ambiguity to protect against — nothing legitimate points at it.
 */
const purgeOrphanedRecords = async () => {
  const liveTokens = await Room.distinct('invite_token');

  const [messages, sessions] = await Promise.all([
    Message.deleteMany({ invite_token: { $nin: liveTokens } }),
    WatchSession.deleteMany({ invite_token: { $nin: liveTokens } }),
  ]);

  const removed = (messages.deletedCount || 0) + (sessions.deletedCount || 0);
  if (removed) {
    log.info('Removed orphaned chat/history rows', {
      messages: messages.deletedCount, watchSessions: sessions.deletedCount,
    });
  }
  return removed;
};

const runSweep = async () => {
  const activeBefore = await Room.countDocuments({ status: 'active' });
  const expired = await expireInactiveRooms();
  const purged = await purgeRetiredRooms();
  const orphans = await purgeOrphanedUploads();
  const orphanRecords = await purgeOrphanedRecords();
  const activeAfter = await Room.countDocuments({ status: 'active' });

  log.info('Lifecycle sweep complete', {
    activeBefore, activeAfter, expired, purged, orphans, orphanRecords,
    dryRun: config.lifecycle.dryRun,
  });

  return { expired, purged, orphans, orphanRecords, activeBefore, activeAfter };
};

const startRoomLifecycleSweep = () => {
  runSweep().catch((err) => log.error('initial sweep failed', { error: err.message }));
  const timer = setInterval(() => {
    runSweep().catch((err) => log.error('sweep failed', { error: err.message }));
  }, config.lifecycle.sweepIntervalMs);
  // Don't hold the process open purely for the sweep timer.
  timer.unref?.();
  return timer;
};

module.exports = {
  startRoomLifecycleSweep,
  runSweep,
  expireInactiveRooms,
  purgeRetiredRooms,
  purgeOrphanedUploads,
  purgeOrphanedRecords,
};
