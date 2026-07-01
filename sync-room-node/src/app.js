const express    = require("express");
const cors       = require("cors");
const config     = require("./config");
const roomRoutes = require("./routes/roomRoutes");

const app = express();

app.use(cors({
  origin:      config.clientUrl,
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "SyncRoom API" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/rooms", roomRoutes);

module.exports = app;
