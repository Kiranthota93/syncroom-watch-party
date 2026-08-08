'use strict';

const path = require('path');

/**
 * Centralised environment configuration.
 *
 * Reads process.env once at startup.  Any missing required variable throws
 * immediately so the server never starts in a broken state.
 *
 * All application code imports from here — never reads process.env directly.
 */

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
};

const parseIceServers = () => {
  const raw = process.env.ICE_SERVERS;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('[config] ICE_SERVERS must be valid JSON (array of RTCIceServer objects)');
    }
  }
  // Dev-only fallback — public STUN only, no TURN. Production must set ICE_SERVERS
  // (including a TURN server) or a large fraction of NAT'd users will have silently
  // broken audio/video.
  return [{ urls: 'stun:stun.l.google.com:19302' }];
};

// `/var` is a conventional Linux location, but on Windows Node resolves it to
// the root of the current drive (for example `D:\\var`). Keep development
// uploads inside the project unless a deployment explicitly sets UPLOADS_DIR.
const defaultUploadsDir = process.platform === 'win32'
  ? path.join(process.cwd(), 'var', 'syncroom-uploads')
  : '/var/syncroom-uploads';

const config = {
  port:      parseInt(process.env.PORT ?? '8000', 10),
  clientUrl: required('CLIENT_URL'),
  mongoUri:  required('MONGO_URI'),
  nodeEnv:   process.env.NODE_ENV ?? 'production',
  isDev:     process.env.NODE_ENV !== 'production',
  // logLevel:  process.env.LOG_LEVEL ?? 'info',

  iceServers: parseIceServers(),

  maxParticipants: parseInt(process.env.MAX_PARTICIPANTS ?? '10', 10),
  maxCamerasOn:    parseInt(process.env.MAX_CAMERAS_ON ?? '6', 10),

  // How long a disconnected participant's room state (online status, voice/video
  // call membership, mic/cam, controller role) is held before being torn down —
  // long enough to survive a page reload without looking like they left.
  disconnectGraceMs: parseInt(process.env.DISCONNECT_GRACE_MS ?? '15000', 10),

  uploads: {
    dir:        process.env.UPLOADS_DIR ?? defaultUploadsDir,
    maxFileSizeBytes: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024), 10), // 2GB
    minFreeDiskBytes: parseInt(process.env.UPLOAD_MIN_FREE_DISK_BYTES ?? String(1 * 1024 * 1024 * 1024), 10), // 1GB safety margin
  },

  // Room lifecycle. Rooms were previously created with a 24h `expires_at` that
  // nothing ever acted on, so every room stayed status:"active" forever —
  // still joinable via its old invite link, and still holding its uploads.
  lifecycle: {
    // How often the sweep runs.
    sweepIntervalMs: parseInt(process.env.ROOM_SWEEP_INTERVAL_MS ?? String(10 * 60 * 1000), 10), // 10m

    // An empty / all-offline room is expired once it has been that way this
    // long. Generous enough to survive a page reload or a brief dropout —
    // disconnectGraceMs (15s) already covers the reconnect case.
    emptyGraceMs: parseInt(process.env.ROOM_EMPTY_GRACE_MS ?? String(15 * 60 * 1000), 10), // 15m

    // Hard ceiling: even a continuously-occupied room expires this long after
    // its last genuine activity, so nothing lives indefinitely.
    maxIdleMs: parseInt(process.env.ROOM_MAX_IDLE_MS ?? String(24 * 60 * 60 * 1000), 10), // 24h

    // How long an expired/ended room is kept before being hard-deleted along
    // with its uploads. Keeps recent history readable without holding storage.
    retentionMs: parseInt(process.env.ROOM_RETENTION_MS ?? String(7 * 24 * 60 * 60 * 1000), 10), // 7d

    // Irreversible stages (hard-deleting rooms and their uploaded video files)
    // are opt-in. Defaults to a dry run that logs exactly what *would* be
    // removed, so the retention settings can be sanity-checked against real
    // data before anything is destroyed. Set ROOM_CLEANUP_DRY_RUN=false to arm.
    // Expiring a room (a reversible status change) always runs for real.
    dryRun: (process.env.ROOM_CLEANUP_DRY_RUN ?? 'true') !== 'false',
  },

  admin: {
    // Read from the environment only — never a literal in source, so the key
    // can be rotated without a code change and can't leak through git history.
    // Unset means the admin API stays disabled (fail closed) rather than
    // falling back to some default that would be identical on every deploy.
    passkey: process.env.ADMIN_PASSKEY || null,
  },
};

Object.defineProperties(config, {
  isDev:  { get() { return this.nodeEnv !== 'production'; } },
  isProd: { get() { return this.nodeEnv === 'production'; } },
});

Object.freeze(config);

module.exports = config;
