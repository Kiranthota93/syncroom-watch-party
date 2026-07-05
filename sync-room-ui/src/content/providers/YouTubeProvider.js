import MediaProvider from './MediaProvider';

/**
 * YouTubeProvider — wraps the YouTube IFrame API player instance.
 *
 * VideoStage calls attachPlayer(ytPlayer) from the react-youtube onReady
 * callback, then forwards YouTube events via the notify*() methods.
 * The PlaybackEngine subscribes to the resulting MediaProvider events and
 * never touches the YouTube API directly.
 *
 * YouTube getPlayerState() values:
 *   -1 unstarted  |  0 ended  |  1 playing  |  2 paused  |  3 buffering
 */
// How often to sample getCurrentTime() while playing, so the pre-seek
// origin is known when buffering starts (ms). Mirrors the ~250ms cadence
// of HTML5 'timeupdate' that LocalVideoProvider relies on for the same reason.
const POSITION_POLL_MS = 250;

class YouTubeProvider extends MediaProvider {
  constructor() {
    super();
    this._player        = null;
    this._ready         = false;

    // Last position sampled while actually playing (state 1). YouTube's
    // getCurrentTime() already reports the SEEK TARGET the instant the
    // buffering state (3) fires — same quirk as Chrome's synchronous
    // currentTime update for HTML5 <video>. Without this, handleBufferingStart
    // records target as the origin, the origin→target delta collapses to ~0,
    // and SeekDetector never recognizes a real seek — so playback:seek is
    // never emitted, the server's playback_state goes stale, and the next
    // heartbeat's drift correction snaps the player back to the pre-seek
    // trajectory (the "jumps, then rewinds a second later" bug).
    this._lastKnownTime = null;
    this._pollTimer     = null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /** Called from VideoStage's onReady callback. */
  attachPlayer(ytPlayer) {
    this._player = ytPlayer;
    this._ready = true;
    this._lastKnownTime = ytPlayer.getCurrentTime();
    this._startPolling();
    this.emit('ready', { duration: ytPlayer.getDuration() });
  }

  _startPolling() {
    clearInterval(this._pollTimer);
    this._pollTimer = setInterval(() => {
      if (this._player?.getPlayerState?.() === 1) {
        this._lastKnownTime = this._player.getCurrentTime();
      }
    }, POSITION_POLL_MS);
  }

  load() {
    // For YouTube, content loading is managed by react-youtube's videoId prop.
    // This method exists for interface compliance and future use.
  }

  destroy() {
    clearInterval(this._pollTimer);
    this._pollTimer = null;
    this._player?.stopVideo?.();
    this._player = null;
    this._ready = false;
    super.destroy();
  }

  // ── Playback control ──────────────────────────────────────────

  play()                 { this._player?.playVideo(); }
  pause()                { this._player?.pauseVideo(); }
  seekTo(time)           { this._player?.seekTo(time, true); }
  setPlaybackRate(rate)  { this._player?.setPlaybackRate(rate); }

  // ── State queries ─────────────────────────────────────────────

  getCurrentTime()  { return this._player?.getCurrentTime() || 0; }
  getDuration()     { return this._player?.getDuration() || 0; }
  isReady()         { return this._ready && !!this._player; }
  isPlaying()       { return this._player?.getPlayerState() === 1; }
  isBuffering()     { return this._player?.getPlayerState() === 3; }

  getState() {
    const s = this._player?.getPlayerState?.();
    if (s === 1) return 'playing';
    if (s === 2) return 'paused';
    if (s === 3) return 'buffering';
    if (s === 0) return 'ended';
    return 'idle';
  }

  // ── Notify methods (called from VideoStage YouTube callbacks) ─

  notifyPlay(currentTime) {
    this.emit('play', { currentTime });
  }

  notifyPause(currentTime) {
    this.emit('pause', { currentTime });
  }

  notifyStateChange(ytState, currentTime) {
    // On entering buffering (3), report the pre-seek origin instead of the
    // target so SeekDetector can compute a real origin→target delta.
    // See the constructor comment on _lastKnownTime for why this is needed.
    if (ytState === 3 && this._lastKnownTime != null) {
      this.emit('statechange', { state: ytState, currentTime: this._lastKnownTime });
      return;
    }
    this.emit('statechange', { state: ytState, currentTime });
  }

  notifyRateChange(rate) {
    this.emit('ratechange', { rate });
  }

  notifyEnd() {
    this.emit('ended');
  }
}

export default YouTubeProvider;
