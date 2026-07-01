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
} = require("../controllers/roomController");

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
router.get("/my-rooms",       getMyRooms);
router.get("/watch-history",  getWatchHistory);
router.get("/:invite_token",  getRoomByInviteToken);

module.exports = router;