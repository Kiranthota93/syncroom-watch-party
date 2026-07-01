import { PLAYBACK } from '../../constants/playback';

/**
 * SyncGuard — prevents socket event re-emission after programmatic player calls.
 *
 * Two separate mechanisms:
 *
 * 1. suppress(event) / consume(event)
 *    Blocks exactly ONE occurrence of a specific event type.
 *    applyPlay suppresses 'play'. applyPause suppresses 'pause'.
 *    A user action of the OPPOSITE type is NEVER blocked.
 *
 * 2. setSyncing() / clearSyncing() / isSyncing
 *    Broad flag used by SeekDetector to skip buffering tracking
 *    during programmatic seekTo calls. Cleared when the seek settles.
 */
class SyncGuard {
  constructor() {
    this._suppressNext  = {};
    this._suppressTimer = null;
    this._isSyncing     = false;
    this._syncTimer     = null;
  }

  // ── Event-specific suppression ────────────────────────────────

  /**
   * Suppress the next emission of `event`.
   * The flag is consumed on first match or cleared after `ms` as a fallback.
   */
  suppress(event, ms = 1000) {
    this._suppressNext[event] = true;
    clearTimeout(this._suppressTimer);
    this._suppressTimer = setTimeout(() => {
      delete this._suppressNext[event];
    }, ms);
  }

  /**
   * Check and consume the suppress flag for `event`.
   * Returns true if the event should be skipped, false otherwise.
   */
  consume(event) {
    if (this._suppressNext[event]) {
      delete this._suppressNext[event];
      return true;
    }
    return false;
  }

  // ── Seek-detection guard ──────────────────────────────────────

  /**
   * Set the syncing flag during a programmatic seekTo operation.
   * Fallback timeout clears it if no state-change event settles it first.
   */
  setSyncing(ms = PLAYBACK.SYNC_TIMEOUT_MS) {
    this._isSyncing = true;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => { this._isSyncing = false; }, ms);
  }

  /** Explicitly clear the syncing flag (called when buffering ends). */
  clearSyncing() {
    this._isSyncing = false;
    clearTimeout(this._syncTimer);
  }

  get isSyncing() { return this._isSyncing; }

  // ── Lifecycle ─────────────────────────────────────────────────

  reset() {
    this._suppressNext = {};
    this._isSyncing    = false;
    clearTimeout(this._suppressTimer);
    clearTimeout(this._syncTimer);
  }

  destroy() {
    this.reset();
  }
}

export default SyncGuard;
