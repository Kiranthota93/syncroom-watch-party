require("dotenv").config();

const http    = require("http");
const config  = require("./config");
const app     = require("./app");
const connectDB = require("./config/db");
const { init }  = require("./socket/socketManager");
const { createLogger } = require("./utils/logger");

const log = createLogger("server");

connectDB();

const server = http.createServer(app);
init(server);

server.listen(config.port, () => {
  log.info("Server running", { port: config.port, env: config.nodeEnv });
});
