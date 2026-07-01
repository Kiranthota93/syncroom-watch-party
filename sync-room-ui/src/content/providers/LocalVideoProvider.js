import MediaProvider               from './MediaProvider';
import { PROVIDER }               from '../../constants/events';
import { PLAYBACK, PLAYER_STATE } from '../../constants/playback';
import { ERROR, HTML5_ERROR_MAP, ERROR_MESSAGES } from '../../constants/errors';

/**
 * LocalVideoProvider — wraps an HTML5 <video> element.
 *
 * Emits the same MediaProvider events as YouTubeProvider so the PlaybackEngine
 * has zero provider-specific knowledge.
 *
 * Normalized player state values:
 *   PLAYER_STATE.PLAYING   (1)  — actively playing
 *   PLAYER_STATE.PAUSED    (2)  — paused with content loaded
 *   PLAYER_STATE.BUFFERING (3)  — seeking or waiting for data
 *   PLAYER_STATE.ENDED     (0)  — playback finished
 *
 * Seek detection: HTML5 fires 'seeking' → BUFFERING, then 'seeked' → PLAYING/PAUSED.
 * More reliable than YouTube's buffering-based approach.
 */

/**
 * Data table mapping HTML5 video events to handler method names.
 * Used to build _boundHandlers and drive _attachListeners / _detachListeners
 * without repetitive addEventListener boilerplate.
 *
 * [ html5-event-name, handler-method-name ]
 */
const VIDEO_EVENTS = Object.freeze([
  ['canplay',        '_handleCanPlay'],
  ['play',           '_handlePlay'],
  ['pause',          '_handlePause'],
  ['timeupdate',     '_handleTimeUpdate'],   // tracks pre-seek position for seek detection
  ['seeking',        '_handleSeeking'],
  ['seeked',         '_handleSeeked'],
  ['waiting',        '_handleWaiting'],
  ['ended',          '_handleEnded'],
  ['error',          '_handleError'],
  ['durationchange', '_handleDurationChange'],
  ['ratechange',     '_handleRateChange'],
]);

class LocalVideoProvider extends MediaProvider {
  constructor() {
    super();
    this._el              = null;
    this._file            = null;
    this._blobUrl         = null;
    this._ready           = false;
    this._shouldBePlaying = false; // tracks intended play state across tab switches

    // Build bound handler map from VIDEO_EVENTS table.
    // Single object replaces 11 individual _onX fields.
    this._boundHandlers = {};
    for (const [, method] of VIDEO_EVENTS) {
      this._boundHandlers[method] = this[method].bind(this);
    }
    // visibilitychange is on document, not the video element — handled separately
    this._boundHandlers._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._boundHandlers._handleVisibilityChange);

    // Tracks a pending "play after seek" callback so pause() can cancel it
    this._pendingPlayOnSeeked = null;

    // Deferred pause emission — cancelled when seeking fires first.
    // Prevents the browser-initiated pause (fired before seeking) from
    // being broadcast as a genuine user pause event.
    this._pauseEmitTimer = null;

    // The most-recent position sampled from 'timeupdate' events (~4 Hz during playback).
    // When 'seeking' fires, el.currentTime is already the TARGET position (Chrome
    // updates it synchronously before any events fire). _lastKnownTime captures the
    // true PRE-SEEK origin, which 'timeupdate' last recorded during active playback.
    // Delta = |target - origin| lets SeekDetector distinguish a real user seek
    // (large jump) from normal buffering (near-zero jump).
    this._lastKnownTime = null;

    // Kept for reference but superseded by _lastKnownTime.
    // Chrome updates el.currentTime BEFORE firing 'pause', so this captures the
    // target X, not the origin Y — making it unreliable for seek detection.
    this._prePausePosition = null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Attach an HTML5 <video> element and a local File.
   * Creates a blob URL, sets it as the video src, and registers all listeners.
   */
  attachElement(videoEl, file) {
    if (this._el) this._detachListeners();

    this._el   = videoEl;
    this._file = file;

    if (this._blobUrl) URL.revokeObjectURL(this._blobUrl);
    this._blobUrl    = URL.createObjectURL(file);
    videoEl.src      = this._blobUrl;
    videoEl.preload  = 'auto';

    this._attachListeners();
  }

  load() {
    // Content loading happens via attachElement().
    // Metadata extraction is in extractFileMetadata (Phase 4.4).
  }

  destroy() {
    document.removeEventListener('visibilitychange', this._boundHandlers._handleVisibilityChange);
    this._cancelPendingPlay();
    clearTimeout(this._pauseEmitTimer);

    if (this._el) {
      this._detachListeners();
      this._el.pause();
      this._el.src = '';
      this._el     = null;
    }

    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }

    this._file             = null;
    this._ready            = false;
    this._shouldBePlaying  = false;
    this._lastKnownTime    = null;
    this._prePausePosition = null;
    this._boundHandlers    = {};
    super.destroy();
  }

  // ── Playback control ──────────────────────────────────────────

  play() {
    // Update intended state from the control method — not from HTML5 events.
    // This ensures _shouldBePlaying is always authoritative regardless of
    // whether the tab is visible when the call arrives.
    this._shouldBePlaying = true;

    const el = this._el;
    if (!el) return;

    this._cancelPendingPlay();

    if (el.seeking) {
      // Browser raises AbortError if play() is called while seeking.
      // Register on the 'seeked' event so play starts after the seek settles.
      const onSeeked = () => {
        this._pendingPlayOnSeeked = null;
        el.removeEventListener('seeked', onSeeked);
        el.play().catch(() => {});
      };
      this._pendingPlayOnSeeked = onSeeked;
      el.addEventListener('seeked', onSeeked);
    } else {
      el.play().catch(() => {});
    }
  }

  pause() {
    // Update intended state from the control method — same reasoning as play().
    // applyPause() calls this even when document.hidden, so this is always set.
    this._shouldBePlaying = false;
    // Cancel any pending seek → play so a pause command is never overridden
    this._cancelPendingPlay();
    this._el?.pause();
  }

  _cancelPendingPlay() {
    if (this._pendingPlayOnSeeked && this._el) {
      this._el.removeEventListener('seeked', this._pendingPlayOnSeeked);
      this._pendingPlayOnSeeked = null;
    }
  }

  seekTo(time)          { if (this._el) this._el.currentTime  = time; }
  setPlaybackRate(rate) { if (this._el) this._el.playbackRate = rate; }

  // ── State queries ─────────────────────────────────────────────

  getCurrentTime()  { return this._el?.currentTime || 0; }
  getDuration()     { return this._el?.duration    || 0; }
  isReady()         { return this._ready && !!this._el; }

  isPlaying() {
    return !!(this._el && !this._el.paused && !this._el.ended);
  }

  isBuffering() {
    return !!(
      this._el &&
      this._el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA &&
      !this._el.paused
    );
  }

  getState() {
    if (!this._el || !this._ready) return 'idle';
    if (this._el.ended)     return 'ended';
    if (this._el.paused)    return 'paused';
    if (this.isBuffering()) return 'buffering';
    return 'playing';
  }

  // ── File metadata ─────────────────────────────────────────────

  get fileName() { return this._file?.name || null; }
  get fileSize() { return this._file?.size || 0;    }
  get mimeType() { return this._file?.type || null; }

  // ── Listener management (data-driven) ─────────────────────────

  /** Register all VIDEO_EVENTS listeners on the element in one loop. */
  _attachListeners() {
    for (const [event, method] of VIDEO_EVENTS) {
      this._el.addEventListener(event, this._boundHandlers[method]);
    }
  }

  /** Remove all VIDEO_EVENTS listeners from the element in one loop. */
  _detachListeners() {
    for (const [event, method] of VIDEO_EVENTS) {
      this._el.removeEventListener(event, this._boundHandlers[method]);
    }
  }

  // ── HTML5 event handlers ──────────────────────────────────────

  _handleCanPlay() {
    if (this._ready) return;
    this._ready = true;
    this.emit(PROVIDER.READY, { duration: this._el.duration });
  }

  _handlePlay() {
    // _shouldBePlaying is managed by play()/pause() control methods, not here.
    const currentTime = this._el.currentTime;
    this.emit(PROVIDER.PLAY,        { currentTime });
    this.emit(PROVIDER.STATECHANGE, { state: PLAYER_STATE.PLAYING, currentTime });
  }

  _handlePause() {
    if (this._el.ended) return;
    if (document.hidden) return;

    // Capture position NOW — before seeking (if that follows) updates el.currentTime.
    // Browsers fire 'pause' before 'seeking', and at 'pause' time el.currentTime
    // still holds the PRE-SEEK origin (Y). _handleSeeking reads this to give
    // SeekDetector the correct origin so it can compute a non-zero position delta.
    this._prePausePosition = this._el.currentTime;

    // Defer 50ms so seeking can cancel this if the pause was browser-initiated
    // (browsers fire 'pause' before 'seeking' when scrubbing while playing).
    clearTimeout(this._pauseEmitTimer);
    this._pauseEmitTimer = setTimeout(() => {
      this._pauseEmitTimer = null;
      this._prePausePosition = null; // genuine pause — origin no longer needed
      if (this._el?.seeking) return; // still seeking — suppress
      // _shouldBePlaying is NOT updated here — it is managed by pause() control method.
      const currentTime = this._el.currentTime;
      this.emit(PROVIDER.PAUSE,       { currentTime });
      this.emit(PROVIDER.STATECHANGE, { state: PLAYER_STATE.PAUSED, currentTime });
    }, PLAYBACK.PAUSE_DEFER_MS);
  }

  _handleTimeUpdate() {
    // Sample the real playback position during active playback (~4 Hz).
    // el.currentTime here is the actual position Y, unaffected by any pending seek.
    // This value is consumed by _handleSeeking as the pre-seek origin so that
    // SeekDetector can compute a meaningful position delta |X - Y|.
    if (!this._el.seeking) {
      this._lastKnownTime = this._el.currentTime;
    }
  }

  _handleSeeking() {
    // Use the last position sampled by timeupdate as the seek origin.
    //
    // Chrome updates el.currentTime synchronously when el.currentTime = X is set,
    // before ANY events fire. This means both 'pause' and 'seeking' already report X,
    // not the origin Y. Capturing el.currentTime from either event gives a zero delta.
    //
    // _lastKnownTime is populated by 'timeupdate' (~every 250ms during playback)
    // and always reflects the true playback position Y. Using it gives
    // SeekDetector delta = |X - Y|, which correctly identifies a real seek.
    //
    // Fallback to el.currentTime if not playing (e.g. seek while paused): delta will
    // be 0, seek detection will not fire — which is intentional because the subsequent
    // 'play' event will carry the correct position and sync all participants.
    const originTime = this._lastKnownTime ?? this._el.currentTime;
    this._lastKnownTime    = null;
    this._prePausePosition = null; // clear legacy field

    clearTimeout(this._pauseEmitTimer);
    this._pauseEmitTimer = null;

    this.emit(PROVIDER.STATECHANGE, {
      state:       PLAYER_STATE.BUFFERING,
      currentTime: originTime,
    });
  }

  _handleSeeked() {
    const state = this._el.paused ? PLAYER_STATE.PAUSED : PLAYER_STATE.PLAYING;
    this.emit(PROVIDER.STATECHANGE, { state, currentTime: this._el.currentTime });
  }

  _handleWaiting() {
    // If the element is seeking, 'seeking' already fired BUFFERING with the
    // correct origin time. Emitting again here would overwrite SeekDetector's
    // _posBeforeBuffer with el.currentTime (the target), collapsing the
    // origin→target delta to zero and breaking seek detection.
    if (this._el?.seeking) return;
    this.emit(PROVIDER.STATECHANGE, {
      state:       PLAYER_STATE.BUFFERING,
      currentTime: this._el.currentTime,
    });
  }

  _handleEnded() {
    this.emit(PROVIDER.ENDED);
    this.emit(PROVIDER.STATECHANGE, {
      state:       PLAYER_STATE.ENDED,
      currentTime: this._el.currentTime,
    });
  }

  _handleError() {
    const err     = this._el?.error;
    const code    = HTML5_ERROR_MAP[err?.code] || ERROR.MEDIA_UNKNOWN;
    const message = ERROR_MESSAGES[code] || err?.message || ERROR_MESSAGES[ERROR.MEDIA_UNKNOWN];
    this.emit(PROVIDER.ERROR, { code, message });
  }

  _handleRateChange() {
    this.emit(PROVIDER.RATECHANGE, { rate: this._el.playbackRate });
  }

  _handleDurationChange() {
    const { duration } = this._el;
    if (duration && !Number.isNaN(duration)) {
      this.emit(PROVIDER.DURATIONCHANGE, { duration });
    }
  }

  _handleVisibilityChange() {
    if (document.visibilityState !== 'visible' || !this._el) return;
    if (this._shouldBePlaying && this._el.paused) {
      this._el.play().catch(() => {});
    }
  }
}

export default LocalVideoProvider;
