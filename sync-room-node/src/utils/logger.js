/**
 * Structured Logger
 *
 * LOG_LEVEL:
 * debug | info | warn | error
 *
 * Example:
 * const { createLogger } = require("../utils/logger");
 * const log = createLogger("server");
 *
 * log.info("Server started", { port: 8000 });
 * log.error("Database failed", error);
 */

const config = require("../config");

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel =
  LEVELS[config.logLevel?.toLowerCase()] ?? LEVELS.info;

const write = (level, context, message, data) => {
  if (LEVELS[level] < currentLevel) {
    return;
  }

  let payload = {};

  if (data instanceof Error) {
    payload = {
      error: data.message,
      ...(config.isDev && { stack: data.stack }),
    };
  } else if (data && typeof data === "object") {
    payload = data;
  } else if (data !== undefined) {
    payload = {
      value: data,
    };
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    ...payload,
  };

  const output = JSON.stringify(logEntry);

  switch (level) {
    case "debug":
      console.debug(output);
      break;

    case "info":
      console.info(output);
      break;

    case "warn":
      console.warn(output);
      break;

    case "error":
      console.error(output);
      break;

    default:
      console.log(output);
  }
};

const createLogger = (context) => ({
  debug(message, data) {
    write("debug", context, message, data);
  },

  info(message, data) {
    write("info", context, message, data);
  },

  warn(message, data) {
    write("warn", context, message, data);
  },

  error(message, data) {
    write("error", context, message, data);
  },
});

module.exports = {
  createLogger,
};