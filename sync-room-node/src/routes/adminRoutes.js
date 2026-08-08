const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/requireAdmin');
const {
  getStats,
  listRooms,
  deleteRoom,
  bulkDeleteRooms,
  deleteRoomContent,
  purgeAllRoomsAndUploads,
  runCleanup,
} = require('../controllers/adminController');

// Every route below is gated — including the verify probe, which exists purely
// so the UI can check a passkey before showing anything.
router.use(requireAdmin);

router.get('/verify', (_req, res) => res.json({ success: true }));
router.get('/stats', getStats);
router.get('/rooms', listRooms);
router.post('/cleanup', runCleanup);
router.post('/rooms/bulk-delete', bulkDeleteRooms);
router.delete('/purge-all', purgeAllRoomsAndUploads);
router.delete('/rooms/:invite_token/content', deleteRoomContent);
router.delete('/rooms/:invite_token', deleteRoom);

module.exports = router;
