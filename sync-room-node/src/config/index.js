'use strict';

const path = require('path');

/**
 * Centralized environment configuration.
 *
 * Reads process.env once at startup.
 * Missing required variables fail fast so the server never starts
 * in a broken configuration.
 */

const required = (name) => {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(
      `[config] Missing required environment variable: ${name}`
    );
  }

  return value.trim();
};

/**
 * WebRTC ICE servers.
 *
 * Production should explicitly configure ICE_SERVERS.
 * STUN-only is supported for now. TURN can be added later.
 *
 * Example:
 * ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"}]
 */
const parseIceServers = () => {
  const raw = process.env.ICE_SERVERS;

  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw new Error('ICE_SERVERS must be an array');
      }

      return parsed;
    } catch (error) {
      throw new Error(
        `[config] ICE_SERVERS must be valid JSON (array of RTCIceServer objects): ${error.message}`
      );
    }
  }

  // Safe fallback for development.
  // Production should explicitly set ICE_SERVERS.
  return [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ];
};

/**
 * CORS / Socket.IO allowed origins.
 *
 * CLIENT_URL:
 *   Primary frontend URL.
 *
 * CLIENT_URLS:
 *   Optional comma-separated additional frontend origins.
 *
 * Example:
 * CLIENT_URL=https://syncroom-watch-party-ten.vercel.app
 * CLIENT_URLS=https://badland-ether-flattery.ngrok-free.dev
 */
const normalizeOrigin = (value) =>
  value.trim().replace(/\/$/, '');

const parseClientUrls = () => {
  const primary = required('CLIENT_URL');

  const additional = (process.env.CLIENT_URLS ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const origins = [
    normalizeOrigin(primary),
    ...additional,
  ];

  // Only allow local development origin outside production.
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173');
  }

  return [...new Set(origins)];
};

/**
 * Upload directory.
 *
 * On Linux production:
 *   /var/syncroom-uploads
 *
 * On Windows development:
 *   ./var/syncroom-uploads
 */
const defaultUploadsDir =
  process.platform === 'win32'
    ? path.join(process.cwd(), 'var', 'syncroom-uploads')
    : '/var/syncroom-uploads';

const config = {
  // ==============================
  // Server
  // ==============================

  port: parseInt(process.env.PORT ?? '8000', 10),

  clientUrl: required('CLIENT_URL'),

  clientUrls: parseClientUrls(),

  mongoUri: required('MONGO_URI'),

  nodeEnv: process.env.NODE_ENV ?? 'production',

  // Consumed by utils/logger.js. Without this key LOG_LEVEL is silently
  // ignored and everything logs at 'info' regardless of what is configured.
  logLevel: process.env.LOG_LEVEL ?? 'info',

  // ==============================
  // WebRTC
  // ==============================

  iceServers: parseIceServers(),

  // ==============================
  // Room / Participant Limits
  // ==============================

  maxParticipants: parseInt(
    process.env.MAX_PARTICIPANTS ?? '10',
    10
  ),

  maxCamerasOn: parseInt(
    process.env.MAX_CAMERAS_ON ?? '6',
    10
  ),

  /**
   * How long disconnected participant state is retained
   * before being considered permanently disconnected.
   */
  disconnectGraceMs: parseInt(
    process.env.DISCONNECT_GRACE_MS ?? '15000',
    10
  ),

  // ==============================
  // Uploads
  // ==============================

  uploads: {
    dir:
      process.env.UPLOADS_DIR ??
      defaultUploadsDir,

    // 2 GB
    maxFileSizeBytes: parseInt(
      process.env.UPLOAD_MAX_FILE_SIZE_BYTES ??
        String(2 * 1024 * 1024 * 1024),
      10
    ),

    // Keep at least 1 GB free
    minFreeDiskBytes: parseInt(
      process.env.UPLOAD_MIN_FREE_DISK_BYTES ??
        String(1 * 1024 * 1024 * 1024),
      10
    ),
  },

  // ==============================
  // Room Lifecycle
  // ==============================

  lifecycle: {
    // Run cleanup every 10 minutes.
    sweepIntervalMs: parseInt(
      process.env.ROOM_SWEEP_INTERVAL_MS ??
        String(10 * 60 * 1000),
      10
    ),

    /**
     * Empty/all-offline room grace period.
     *
     * Production default: 6 hours.
     */
    emptyGraceMs: parseInt(
      process.env.ROOM_EMPTY_GRACE_MS ??
        String(6 * 60 * 60 * 1000),
      10
    ),

    /**
     * Hard maximum idle lifetime.
     *
     * Production default: 24 hours.
     */
    maxIdleMs: parseInt(
      process.env.ROOM_MAX_IDLE_MS ??
        String(24 * 60 * 60 * 1000),
      10
    ),

    /**
     * How long expired/ended rooms remain before
     * hard deletion of room data and uploaded files.
     *
     * Production default: 7 days.
     */
    retentionMs: parseInt(
      process.env.ROOM_RETENTION_MS ??
        String(7 * 24 * 60 * 60 * 1000),
      10
    ),

    /**
     * false = actually delete expired room content.
     *
     * true = dry-run; only logs what would be deleted.
     */
    dryRun:
      (process.env.ROOM_CLEANUP_DRY_RUN ?? 'true') !==
      'false',
  },

  // ==============================
  // Admin
  // ==============================

  admin: {
    /**
     * Admin API is disabled when ADMIN_PASSKEY is not configured.
     * Never hard-code the secret in source.
     */
    passkey: process.env.ADMIN_PASSKEY || null,
  },
};

// ==============================
// Environment helpers
// ==============================

Object.defineProperties(config, {
  isDev: {
    get() {
      return this.nodeEnv !== 'production';
    },
  },

  isProd: {
    get() {
      return this.nodeEnv === 'production';
    },
  },
});

// Prevent accidental mutation at runtime.
Object.freeze(config);

module.exports = config;
