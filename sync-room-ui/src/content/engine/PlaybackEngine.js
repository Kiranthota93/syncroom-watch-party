import { PROVIDER, ENGINE_OUTBOUND }  from '../../constants/events';
import { PLAYBACK, PLAYER_STATE }     from '../../constants/playback';
import SyncGuard                      from './SyncGuard';
import SeekDetector                   from './SeekDetector';
import PlaybackStateMachine, { STATES } from './PlaybackStateMachine';

/**
 * PlaybackEngine — provider-independent synchronization coordinator.
 *
 * Delegates sync guard logic to SyncGuard and seek detection to SeekDetector.
 * Owns provider subscription, outbound handler registry, and all apply* methods.
 *
 * Inbound  (PlaybackService → engine): applyPlay, applyPause, applySeek,
 *                                      applyRate, applySync, applyJoinSync
 * Outbound (engine → PlaybackService): ENGINE_OUTBOUND.PLAY | PAUSE | SEEK | RATE
 */
class PlaybackEngine {
  constructor({ isController = false } = {}) {
    this._provider     = null;
    this._isController = isController;

    this._syncGuard    = new SyncGuard();
    this._stateMachine = new PlaybackStateMachine();

    this._seekDetector = new SeekDetector({
      onSeekDetected: () => {
        const time = this._provider?.getCurrentTime() ?? 0;
        this._triggerOutbound(ENGINE_OUTBOUND.SEEK, { current_time: time });

        // Keep seekInProgress=true for 1 second after emitting the seek event.
        // This covers: debounce already elapsed (200ms) + network round-trip (~50ms)
        // + server processing + server broadcast + client applySeek.
        // During this window the server still has the pre-seek current_time, so
        // the heartbeat must not compare against it.
        clearTimeout(this._seekClearTimer);
        this._seekClearTimer = setTimeout(() => {
          this._seekInProgress = false;
        }, 1000);
      },
    });

    this._outboundHandlers = {};

    // True from when a user-initiated seek is detected until 1 second after the
    // playback:seek event is emitted. Suppresses the heartbeat during this window
    // so the server's stale playback_state does not trigger a drift correction
    // that snaps the player back to the pre-seek position.
    this._seekInProgress = false;
    this._seekClearTimer = null;

    this._onReady       = this._handleProviderReady.bind(this);
    this._onPlay        = this._handleProviderPlay.bind(this);
    this._onPause       = this._handleProviderPause.bind(this);
    this._onStateChange = this._handleProviderStateChange.bind(this);
    this._onRateChange  = this._handleProviderRateChange.bind(this);
    this._onEnded       = this._handleProviderEnded.bind(this);
    this._onError       = this._handleProviderError.bind(this);
  }

  // ── Provider management ───────────────────────────────────────

  setProvider(provider) {
    if (this._provider) {
      this._provider.off(PROVIDER.READY,       this._onReady);
      this._provider.off(PROVIDER.PLAY,        this._onPlay);
      this._provider.off(PROVIDER.PAUSE,       this._onPause);
      this._provider.off(PROVIDER.STATECHANGE, this._onStateChange);
      this._provider.off(PROVIDER.RATECHANGE,  this._onRateChange);
      this._provider.off(PROVIDER.ENDED,       this._onEnded);
      this._provider.off(PROVIDER.ERROR,       this._onError);
    }

    this._syncGuard.reset();
    this._seekDetector.reset();
    this._stateMachine.reset();
    this._seekInProgress = false;
    clearTimeout(this._seekClearTimer);

    this._provider = provider;

    if (provider) {
      this._stateMachine.transition(STATES.LOADING);
      provider.on(PROVIDER.READY,       this._onReady);
      provider.on(PROVIDER.PLAY,        this._onPlay);
      provider.on(PROVIDER.PAUSE,       this._onPause);
      provider.on(PROVIDER.STATECHANGE, this._onStateChange);
      provider.on(PROVIDER.RATECHANGE,  this._onRateChange);
      provider.on(PROVIDER.ENDED,       this._onEnded);
      provider.on(PROVIDER.ERROR,       this._onError);
    }
  }

  setIsController(value) {
    this._isController = value;
  }

  // ── Outbound handler registration ────────────────────────────

  onOutbound(event, handler) {
    this._outboundHandlers[event] = handler;
  }

  _triggerOutbound(event, data) {
    this._outboundHandlers[event]?.(data);
  }

  /**
   * Called by VideoStage custom control handlers (skip, scrub) immediately
   * before setting el.currentTime. HTML5 media events may be queued as async
   * macrotasks, so there is a window between el.currentTime = X and the
   * 'seeking' event being dispatched during which the heartbeat could fire
   * with stale server data and snap the player back.
   *
   * This method sets _seekInProgress = true proactively, before any events
   * fire, so the heartbeat is already suppressed when the events are processed.
   * The 500ms safety timeout clears it if no real seek follows.
   */
  notifySeekStarted() {
    this._seekInProgress = true;
    clearTimeout(this._seekClearTimer);
    this._seekClearTimer = setTimeout(() => {
      this._seekInProgress = false;
    }, 500);
  }

  // ── State machine accessors ───────────────────────────────────

  get state()    { return this._stateMachine.state; }
  canPlay()      { return this._stateMachine.canPlay();  }
  canPause()     { return this._stateMachine.canPause(); }
  canSeek()      { return this._stateMachine.canSeek();  }
  onStateChange(fn) { return this._stateMachine.onChange(fn); }

  // ── Provider event handlers ───────────────────────────────────

  _handleProviderReady() {
    this._stateMachine.transition(STATES.READY);
  }

  _handleProviderPlay({ currentTime }) {
    this._stateMachine.transition(STATES.PLAYING);
    if (this._syncGuard.consume(PROVIDER.PLAY)) return;
    if (this._seekDetector.justSeeked) return;
    if (!this._isController) return;
    this._triggerOutbound(ENGINE_OUTBOUND.PLAY, { current_time: currentTime });
  }

  _handleProviderPause({ currentTime }) {
    this._stateMachine.transition(STATES.PAUSED);
    if (this._syncGuard.consume(PROVIDER.PAUSE)) return;
    if (!this._isController) return;
    this._triggerOutbound(ENGINE_OUTBOUND.PAUSE, { current_time: currentTime });
  }

  _handleProviderStateChange({ state, currentTime }) {
    if (state === PLAYER_STATE.BUFFERING) {
      this._stateMachine.transition(STATES.BUFFERING);
      if (!this._syncGuard.isSyncing && this._isController) {
        this._seekDetector.handleBufferingStart(currentTime);
        // Mark a potential seek in progress so the heartbeat is suppressed
        // until we know whether this is a real seek or just normal buffering.
        this._seekInProgress = true;
      }
      return;
    }

    // Exiting buffering — clear sync guard, update state, check for real seek
    this._syncGuard.clearSyncing();
    const nextState = state === PLAYER_STATE.PLAYING ? STATES.PLAYING : STATES.PAUSED;
    this._stateMachine.transition(nextState);
    if (this._isController) {
      const wasJustSeeked = this._seekDetector.justSeeked;
      this._seekDetector.handleBufferingEnd(currentTime);
      // If handleBufferingEnd confirmed a real seek, onSeekDetected will clear
      // _seekInProgress after 1s. If it was just normal buffering (no real seek),
      // clear immediately so the heartbeat is not suppressed unnecessarily.
      if (!this._seekDetector.justSeeked && !wasJustSeeked) {
        this._seekInProgress = false;
      }
    }
  }

  _handleProviderRateChange({ rate }) {
    if (this._syncGuard.consume(PROVIDER.RATECHANGE)) return;
    if (!this._isController) return;
    this._triggerOutbound(ENGINE_OUTBOUND.RATE, { playback_rate: rate });
  }

  _handleProviderEnded() {
    this._stateMachine.transition(STATES.ENDED);
  }

  _handleProviderError() {
    this._stateMachine.transition(STATES.ERROR);
  }

  // ── Inbound commands (called by PlaybackService) ──────────────

  applyPlay(current_time) {
    if (!this._provider) return;
    this._syncGuard.suppress(PROVIDER.PLAY);
    this._syncGuard.setSyncing();
    this._provider.seekTo(current_time);
    this._provider.play();
  }

  applyPause(current_time) {
    if (!this._provider) return;
    this._syncGuard.suppress(PROVIDER.PAUSE);
    this._syncGuard.setSyncing();
    this._provider.seekTo(current_time);
    this._provider.pause();
  }

  applySeek(current_time, status) {
    if (!this._provider) return;
    this._syncGuard.suppress(status === 'playing' ? PROVIDER.PLAY : PROVIDER.PAUSE);
    this._syncGuard.setSyncing();
    this._provider.seekTo(current_time);
    if (status === 'playing') {
      this._provider.play();
    } else {
      this._provider.pause();
    }
  }

  applyRate(playback_rate) {
    if (!this._provider) return;
    this._syncGuard.suppress(PROVIDER.RATECHANGE, 500);
    this._provider.setPlaybackRate(playback_rate);
  }

  applySync(current_time, status) {
    if (!this._provider) return;
    this._syncGuard.suppress(status === 'playing' ? PROVIDER.PLAY : PROVIDER.PAUSE);
    this._syncGuard.setSyncing(PLAYBACK.JOIN_SYNC_TIMEOUT_MS);
    this._provider.seekTo(current_time);
    if (status === 'playing') {
      this._provider.play();
    } else {
      this._provider.pause();
    }
  }

  applyJoinSync(playback_state) {
    if (!this._provider || !playback_state) return;
    const { status, current_time, playback_rate, updated_at } = playback_state;

    if (status === 'idle' || status === 'ended') return;

    const elapsed = updated_at
      ? (Date.now() - new Date(updated_at).getTime()) / 1000
      : 0;

    const rawTime =
      status === 'playing'
        ? current_time + elapsed * (playback_rate || 1)
        : current_time;

    const duration = this._provider.getDuration();
    const syncTime = Math.min(Math.max(0, rawTime), duration || rawTime);

    if (playback_rate && playback_rate !== 1) {
      this._provider.setPlaybackRate(playback_rate);
    }

    this._syncGuard.suppress(status === 'playing' ? PROVIDER.PLAY : PROVIDER.PAUSE);
    this._syncGuard.setSyncing(PLAYBACK.JOIN_SYNC_TIMEOUT_MS);
    this._provider.seekTo(syncTime);

    if (status === 'playing') {
      this._provider.play();
    }
  }

  // ── Snapshot (for heartbeat) ──────────────────────────────────

  getSnapshot() {
    return {
      currentTime:    this._provider?.getCurrentTime() ?? 0,
      isPlaying:      this._provider?.isPlaying()      ?? false,
      seekInProgress: this._seekInProgress,
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────

  destroy() {
    this.setProvider(null);
    this._syncGuard.destroy();
    this._seekDetector.destroy();
    this._stateMachine.destroy();
    clearTimeout(this._seekClearTimer);
    this._outboundHandlers = {};
  }
}

export default PlaybackEngine;
