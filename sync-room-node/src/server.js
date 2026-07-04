require("dotenv").config();
const mongoose = require("mongoose");
const http    = require("http");
const config  = require("./config");
const app     = require("./app");
const connectDB = require("./config/db");
const { init }  = require("./socket/socketManager");
const { createLogger } = require("./utils/logger");

const log = createLogger("server");

const start = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    init(server);

    server.listen(config.port, () => {
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

const shutdown = async (signal) => {
  log.info(`${signal} received. Shutting down...`);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
