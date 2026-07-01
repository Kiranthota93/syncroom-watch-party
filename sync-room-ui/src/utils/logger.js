/**
 * Structured logger — frontend.
 *
 * Set VITE_LOG_LEVEL in .env to control verbosity:
 *   debug | info | warn | error   (default: warn in production, info in dev)
 *
 * Usage:
 *   import { createLogger } from '../utils/logger';
 *   const log = createLogger('VideoStage');
 *   log.warn('Seek blocked', { isSyncing: true });
 *   log.error('File load failed', err);
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const defaultLevel = import.meta.env.DEV ? 'info' : 'warn';
const currentLevel =
  LEVELS[import.meta.env.VITE_LOG_LEVEL?.toLowerCase()] ??
  LEVELS[defaultLevel];

const write = (level, context, message, data) => {
  if (LEVELS[level] < currentLevel) return;

  const prefix = `[${context}]`;

  /* eslint-disable no-console */
  if (data !== undefined) {
    console[level](`${prefix} ${message}`, data);
  } else {
    console[level](`${prefix} ${message}`);
  }
  /* eslint-enable no-console */
};

export const createLogger = (context) => ({
  debug: (msg, data) => write('debug', context, msg, data),
  info:  (msg, data) => write('info',  context, msg, data),
  warn:  (msg, data) => write('warn',  context, msg, data),
  error: (msg, data) => write('error', context, msg, data),
});
