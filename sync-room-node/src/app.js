const express = require("express");
const cors = require("cors");
const config = require("./config");
const roomRoutes = require("./routes/roomRoutes");

const app = express();

app.disable("x-powered-by");

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

app.use(express.json());

/* Health */

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "SyncRoom API",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
  });
});

/* API */

app.use("/api/rooms", roomRoutes);

/* 404 */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/* Error Handler */

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: "Internal Server Error",
  });
});

module.exports = app;