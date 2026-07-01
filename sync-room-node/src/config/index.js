'use strict';

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

const config = {
  port:      parseInt(process.env.PORT ?? '8000', 10),
  clientUrl: required('CLIENT_URL'),
  mongoUri:  required('MONGO_URI'),
  nodeEnv:   process.env.NODE_ENV ?? 'development',
  logLevel:  process.env.LOG_LEVEL ?? 'info',
};

Object.defineProperties(config, {
  isDev:  { get() { return this.nodeEnv !== 'production'; } },
  isProd: { get() { return this.nodeEnv === 'production'; } },
});

Object.freeze(config);

module.exports = config;
