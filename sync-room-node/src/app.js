const express = require("express");
const cors = require("cors");
const config = require("./config");
const roomRoutes = require("./routes/roomRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.disable("x-powered-by");

// The app runs behind a reverse proxy (nginx in Docker, Vite's proxy in dev).
// Without this every request reports the proxy's address as req.ip, so the
// admin route's per-IP rate limit would treat all callers as one client — a
// single attacker could lock out every admin. Trust exactly one hop; trusting
// more would let a client forge X-Forwarded-For and evade the limit entirely.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.clientUrls,
    credentials: true,
  })
);

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
    message: "SyncRoom API is healthy",
    status: "ok",
    uptime: process.uptime(),
  });
});

/* API */

app.use("/api/rooms", roomRoutes);
app.use("/api/admin", adminRoutes);

/* 404 */

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/* Error Handler */

app.use((err, req, res) => {
  console.error(err);

  res.status(500).json({
    error: "Internal Server Error",
  });
});

module.exports = app;