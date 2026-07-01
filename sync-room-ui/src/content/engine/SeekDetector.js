import { PLAYBACK } from '../../constants/playback';

/**
 * SeekDetector — isolates seek detection logic from PlaybackEngine.
 *
 * Watches for the buffering → playing/paused state transition that signals
 * a user-initiated seek, applies a position-change threshold to filter out
 * normal buffering, debounces the result, then fires onSeekDetected().
 *
 * Compatible with both providers:
 *   YouTube:   state 3 (buffering) → state 1/2
 *   HTML5 video: seeking event (→ state 3) → seeked event (→ state 1/2)
 *
 * @param {object}   options
 * @param {Function} options.onSeekDetected — called when a real seek is confirmed
 */
class SeekDetector {
  constructor({ onSeekDetected }) {
    this._onSeekDetected  = onSeekDetected;
    this._wasBuffering    = false;
    this._posBeforeBuffer = null;
    this._seekDebounce    = null;
    this._justSeeked      = false;
  }

  /** True for JUST_SEEKED_MS after a real seek — suppresses spurious play events. */
  get justSeeked() { return this._justSeeked; }

  // ── State transition handlers ─────────────────────────────────

  /**
   * Call when the provider enters buffering state (state 3).
   * Records the position so it can be compared when buffering ends.
   */
  handleBufferingStart(currentTime) {
    // Only record the origin on the FIRST entry into this buffering cycle.
    // 'waiting' can fire after 'seeking' with el.currentTime already at the
    // target position — overwriting _posBeforeBuffer would collapse the
    // origin→target delta to zero and cause seek detection to miss.
    if (this._wasBuffering) return;
    this._wasBuffering    = true;
    this._posBeforeBuffer = currentTime;
    clearTimeout(this._seekDebounce);
  }

  /**
   * Call when the provider exits buffering (state 1 or 2).
   * Determines whether the position jump qualifies as a real seek.
   * If so, debounces and fires onSeekDetected.
   */
  handleBufferingEnd(currentTime) {
    if (!this._wasBuffering) return;
    this._wasBuffering = false;

    const isRealSeek =
      Math.abs(currentTime - (this._posBeforeBuffer ?? currentTime)) >
      PLAYBACK.SEEK_REAL_THRESHOLD_S;

    this._posBeforeBuffer = null;

    if (!isRealSeek) return;

    this._justSeeked = true;
    setTimeout(() => { this._justSeeked = false; }, PLAYBACK.JUST_SEEKED_MS);

    clearTimeout(this._seekDebounce);
    this._seekDebounce = setTimeout(() => {
      this._onSeekDetected?.();
    }, PLAYBACK.SEEK_DEBOUNCE_MS);
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  reset() {
    this._wasBuffering    = false;
    this._posBeforeBuffer = null;
    this._justSeeked      = false;
    clearTimeout(this._seekDebounce);
  }

  destroy() {
    this.reset();
    this._onSeekDetected = null;
  }
}

export default SeekDetector;
