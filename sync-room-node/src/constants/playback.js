/**
 * Playback configuration constants — backend mirror of frontend/src/constants/playback.js.
 */

const PLAYBACK = {
  HEARTBEAT_INTERVAL_MS: 5000,
  DRIFT_THRESHOLD_S:     2,
  VALID_RATES:           [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
};

const PLAYER_STATE = {
  ENDED:     0,
  PLAYING:   1,
  PAUSED:    2,
  BUFFERING: 3,
};

module.exports = { PLAYBACK, PLAYER_STATE };
