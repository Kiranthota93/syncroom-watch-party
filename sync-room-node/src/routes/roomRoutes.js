const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  updateContentSource,
  markReady,
  getRoomByInviteToken,
  getRoomByRoomCode,
  rejoinRoom,
  transferController,
  transferHost,
  kickParticipant,
  muteParticipant,
  raiseHand,
  updateRoomSettings,
  getRoomStats,
  getMyRooms,
  getWatchHistory,
  getIceServers,
} = require("../controllers/roomController");
const {
  uploadChunkMiddleware,
  initUpload,
  uploadChunk,
  streamVideo,
} = require("../controllers/videoUploadController");

router.post("/create", createRoom);
router.post("/join", joinRoom);
router.post("/by-code", getRoomByRoomCode);
router.post("/leave", leaveRoom);
router.post("/end", endRoom);
router.post("/rejoin", rejoinRoom);
router.post("/content", updateContentSource);
router.post("/ready", markReady);
router.post("/transfer-controller", transferController);
router.post("/transfer-host",  transferHost);
router.post("/kick",           kickParticipant);
router.post("/mute",           muteParticipant);
router.post("/raise-hand",     raiseHand);
router.patch("/settings",      updateRoomSettings);
router.get("/stats",          getRoomStats);
router.get("/ice-servers",    getIceServers);
router.get("/my-rooms",       getMyRooms);
router.get("/watch-history",  getWatchHistory);

// Streamed local video (new, parallel content source — see videoUploadController.js)
router.post("/:invite_token/video/upload-init",  initUpload);
router.post("/:invite_token/video/upload-chunk", uploadChunkMiddleware, uploadChunk);
router.get("/:invite_token/video/:file_id",      streamVideo);

router.get("/:invite_token",  getRoomByInviteToken);

module.exports = router;