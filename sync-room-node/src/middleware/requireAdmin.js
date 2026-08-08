'use strict';

const crypto = require('crypto');
const config = require('../config');
const { createLogger } = require('../utils/logger');

const log = createLogger('requireAdmin');

// Simple in-process throttle. The admin key is a single shared secret with no
// account lockout behind it, so without this an attacker could grind it at
// request speed. Per-IP because there is no user identity to key on.
const attempts = new Map(); // ip -> { count, firstAt, blockedUntil }

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const BLOCK_MS = 15 * 60 * 1000;

const clientIp = (req) =>
  req.ip || req.socket?.remoteAddress || 'unknown';

// Constant-time comparison so response latency can't be used to recover the
// key byte by byte. Lengths are hashed first because timingSafeEqual throws on
// length mismatch — and that throw would itself leak the key's length.
const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const requireAdmin = (req, res, next) => {
  // Fail closed: with no key configured the admin surface simply does not exist.
  if (!config.admin.passkey) {
    return res.status(503).json({
      success: false,
      message: 'Admin API is not configured on this server',
    });
  }

  const ip = clientIp(req);
  const now = Date.now();
  const record = attempts.get(ip);

  if (record?.blockedUntil && record.blockedUntil > now) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed attempts. Try again later.',
      retry_after_s: Math.ceil((record.blockedUntil - now) / 1000),
    });
  }

  const provided = req.get('x-admin-key') || '';

  if (!provided || !safeEqual(provided, config.admin.passkey)) {
    const fresh = !record || now - record.firstAt > WINDOW_MS;
    const count = fresh ? 1 : record.count + 1;
    const entry = { count, firstAt: fresh ? now : record.firstAt };

    if (count >= MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_MS;
      // Never log the submitted value — only that a failure happened.
      log.warn('Admin auth blocked after repeated failures', { ip, count });
    }

    attempts.set(ip, entry);
    return res.status(401).json({ success: false, message: 'Invalid passkey' });
  }

  attempts.delete(ip);
  return next();
};

module.exports = { requireAdmin };
