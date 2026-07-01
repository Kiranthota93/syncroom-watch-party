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
class YouTubeProvider extends MediaProvider {
  constructor() {
    super();
    this._player = null;
    this._ready = false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /** Called from VideoStage's onReady callback. */
  attachPlayer(ytPlayer) {
    this._player = ytPlayer;
    this._ready = true;
    this.emit('ready', { duration: ytPlayer.getDuration() });
  }

  load() {
    // For YouTube, content loading is managed by react-youtube's videoId prop.
    // This method exists for interface compliance and future use.
  }

  destroy() {
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
