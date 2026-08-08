require("dotenv").config();
const mongoose = require("mongoose");
const http    = require("http");
const config  = require("./config");
const app     = require("./app");
const connectDB = require("./config/db");
const { init, getIO } = require("./socket/socketManager");
const { createLogger } = require("./utils/logger");
const { startRoomLifecycleSweep } = require("./utils/roomLifecycle");

const log = createLogger("server");

// Held so shutdown can close them in the right order.
let httpServer = null;
let io = null;
let sweepTimer = null;

const start = async () => {
  try {
    await connectDB();

    httpServer = http.createServer(app);
    init(httpServer);
    io = getIO();
    sweepTimer = startRoomLifecycleSweep();

    httpServer.listen(config.port, () => {
      log.info("Server running", {
        port: config.port,
        env: config.nodeEnv,
      });
    });
  } catch (err) {
    log.error("Failed to start server", {
      message: err.message,
    });

    process.exit(1);
  }
};

start();

/**
 * Graceful shutdown.
 *
 * Docker/systemd send SIGTERM on every redeploy and wait before SIGKILL.
 * Exiting immediately drops in-flight HTTP requests (including partial video
 * chunk uploads) and yanks every websocket without a close frame, so clients
 * see an error rather than a clean reconnect. Close in dependency order —
 * stop accepting new work, hang up sockets, then release the DB — and keep a
 * hard timeout so a stuck connection can't block the deploy forever.
 */
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return; // a second Ctrl-C shouldn't re-enter this
  shuttingDown = true;

  log.info(`${signal} received. Shutting down...`);

  const forceExit = setTimeout(() => {
    log.warn("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (sweepTimer) clearInterval(sweepTimer);

    if (io) {
      await new Promise((resolve) => io.close(resolve));
    }

    if (httpServer?.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    log.info("Shutdown complete");
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    log.error("Error during shutdown", { message: err.message });
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// A rejected promise that nobody handles leaves the process in an unknown
// state; log it loudly rather than letting Node exit silently on newer versions.
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled promise rejection", { reason: String(reason) });
});

process.on("uncaughtException", (err) => {
  log.error("Uncaught exception — shutting down", { message: err.message, stack: err.stack });
  shutdown("uncaughtException");
});
