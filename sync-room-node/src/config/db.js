const mongoose = require("mongoose");
const dns      = require("dns");
const config   = require("./index");
const { createLogger } = require("../utils/logger");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const log = createLogger("db");

const connectDB = async () => {
  try {
    log.info("Connecting to MongoDB", { uriExists: !!config.mongoUri });

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          10000,
      connectTimeoutMS:         10000,
      family: 4,
    });

    log.info("MongoDB connected");
  } catch (error) {
    log.error("MongoDB connection failed", {
      message: error.message,
      hint:    "Check Atlas IP whitelist, internet connection, or flush DNS cache",
    });
  }
};

module.exports = connectDB;
