/**
 * Structured logger — backend.
 *
 * Set LOG_LEVEL in .env to control verbosity:
 *   debug | info | warn | error   (default: info)
 *
 * Usage:
 *   const { createLogger } = require('../utils/logger');
 *   const log = createLogger('socketManager');
 *   log.info('Socket connected', { socketId });
 *   log.error('Handler failed', { error: err.message });
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel =
  LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

const timestamp = () => new Date().toISOString();

const write = (level, context, message, data) => {
  if (LEVELS[level] < currentLevel) return;

  const prefix = `[${timestamp()}] [${level.toUpperCase().padEnd(5)}] [${context}]`;
  const line   = `${prefix} ${message}`;

  if (data !== undefined) {
    const payload = data instanceof Error ? { message: data.message, stack: data.stack } : data;
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line, payload);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line);
  }
};

const createLogger = (context) => ({
  debug: (msg, data) => write('debug', context, msg, data),
  info:  (msg, data) => write('info',  context, msg, data),
  warn:  (msg, data) => write('warn',  context, msg, data),
  error: (msg, data) => write('error', context, msg, data),
});

module.exports = { createLogger };
