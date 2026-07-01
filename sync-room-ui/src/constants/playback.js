/**
 * Playback configuration constants — timeouts, thresholds, and enumerations.
 *
 * Every magic number in the playback engine must reference one of these.
 * Changing a value here propagates everywhere automatically.
 */

export const PLAYBACK = {
  /** How long to block state-change seek detection after a programmatic seek (ms). */
  SYNC_TIMEOUT_MS:       300,

  /** Debounce window before emitting playback:seek after seek detection (ms). */
  SEEK_DEBOUNCE_MS:      200,

  /** How long justSeeked flag suppresses a play event after seek detection (ms). */
  JUST_SEEKED_MS:        300,

  /** Defer pause emission to allow seeking to cancel it (ms). */
  PAUSE_DEFER_MS:        50,

  /** Sync guard for join/reconnect operations — covers longer seeks (ms). */
  JOIN_SYNC_TIMEOUT_MS:  1000,

  /** How often each client sends a heartbeat position report (ms). */
  HEARTBEAT_INTERVAL_MS: 5000,

  /** Minimum drift before the server sends a correction (seconds). */
  DRIFT_THRESHOLD_S:     2,

  /** Minimum position jump to classify a seek as user-initiated (seconds). */
  SEEK_REAL_THRESHOLD_S: 1,

  /** Allowed playback rates. */
  VALID_RATES:           [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
};

/**
 * Normalized player state codes.
 * Matches YouTube IFrame API states so the PlaybackEngine is provider-agnostic.
 * LocalVideoProvider maps HTML5 events to these values.
 */
export const PLAYER_STATE = {
  ENDED:     0,
  PLAYING:   1,
  PAUSED:    2,
  BUFFERING: 3,
};
