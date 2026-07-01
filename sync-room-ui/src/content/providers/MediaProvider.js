/**
 * MediaProvider — abstract base class for all content providers.
 *
 * Every provider (YouTube, LocalVideo, Vimeo, HLS …) must extend this class
 * and implement the methods marked as abstract below.
 *
 * The PlaybackEngine communicates exclusively through this interface and has
 * no knowledge of which concrete provider is active.
 *
 * Player State values returned by getState():
 *   'idle'      — no content loaded
 *   'ready'     — loaded but not playing
 *   'playing'   — actively playing
 *   'paused'    — paused with content loaded
 *   'buffering' — waiting for data
 *   'ended'     — playback finished
 *   'error'     — provider encountered an error
 *
 * Events emitted via on() / emit():
 *   'ready'       — provider is loaded and ready for playback
 *   'play'        — playback started  { currentTime }
 *   'pause'       — playback paused   { currentTime }
 *   'statechange' — player state changed { state, currentTime }
 *   'ratechange'  — playback rate changed { rate }
 *   'ended'       — playback finished
 *   'error'       — provider error { message }
 */
class MediaProvider {
  constructor() {
    this._listeners = {};
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /** Load content from metadata (e.g. { video_id } for YouTube). */
  load(_metadata) {}

  /** Release all resources held by this provider. */
  destroy() {
    this._listeners = {};
  }

  // ── Playback control ─────────────────────────────────────────

  play()                  {}
  pause()                 {}
  seekTo(_time)           {}
  setPlaybackRate(_rate)  {}

  // ── State queries ─────────────────────────────────────────────

  getCurrentTime()  { return 0; }
  getDuration()     { return 0; }
  isReady()         { return false; }
  isPlaying()       { return false; }
  isBuffering()     { return false; }

  /** Returns one of the Player State strings listed above. */
  getState()        { return 'idle'; }

  // ── Event system ──────────────────────────────────────────────

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return this;
  }

  off(event, callback) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter((fn) => fn !== callback);
    return this;
  }

  emit(event, data) {
    this._listeners[event]?.forEach((fn) => fn(data));
  }
}

export default MediaProvider;
