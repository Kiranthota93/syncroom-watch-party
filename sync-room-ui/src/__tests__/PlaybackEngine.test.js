import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PlaybackEngine               from '../content/engine/PlaybackEngine';
import MediaProvider                from '../content/providers/MediaProvider';
import { PROVIDER, ENGINE_OUTBOUND } from '../constants/events';
import { STATES }                   from '../content/engine/PlaybackStateMachine';

/**
 * MockProvider — minimal MediaProvider subclass for testing.
 * Emits events synchronously when play/pause/seekTo are called
 * so the engine's event handlers fire immediately in tests.
 */
class MockProvider extends MediaProvider {
  constructor() {
    super();
    this._currentTime  = 0;
    this._duration     = 300;
    this._playing      = false;
    this.playCalls     = 0;
    this.pauseCalls    = 0;
    this.seekCalls     = [];
    this.rateCalls     = [];
  }

  play() {
    this._playing = true;
    this.playCalls++;
    this.emit(PROVIDER.PLAY, { currentTime: this._currentTime });
  }

  pause() {
    this._playing = false;
    this.pauseCalls++;
    this.emit(PROVIDER.PAUSE, { currentTime: this._currentTime });
  }

  seekTo(time) {
    this._currentTime = time;
    this.seekCalls.push(time);
    this.emit(PROVIDER.STATECHANGE, { state: 3, currentTime: time });    // buffering
    this.emit(PROVIDER.STATECHANGE, { state: this._playing ? 1 : 2, currentTime: time }); // settled
  }

  setPlaybackRate(rate) {
    this.rateCalls.push(rate);
    this.emit(PROVIDER.RATECHANGE, { rate });
  }

  getCurrentTime()  { return this._currentTime; }
  getDuration()     { return this._duration; }
  isPlaying()       { return this._playing; }
  isReady()         { return true; }
  getState()        { return this._playing ? 'playing' : 'paused'; }
}

describe('PlaybackEngine', () => {
  let engine;
  let provider;
  let outboundPlay;
  let outboundPause;
  let outboundSeek;
  let outboundRate;

  beforeEach(() => {
    vi.useFakeTimers();

    engine   = new PlaybackEngine({ isController: true });
    provider = new MockProvider();

    outboundPlay  = vi.fn();
    outboundPause = vi.fn();
    outboundSeek  = vi.fn();
    outboundRate  = vi.fn();

    engine.onOutbound(ENGINE_OUTBOUND.PLAY,  outboundPlay);
    engine.onOutbound(ENGINE_OUTBOUND.PAUSE, outboundPause);
    engine.onOutbound(ENGINE_OUTBOUND.SEEK,  outboundSeek);
    engine.onOutbound(ENGINE_OUTBOUND.RATE,  outboundRate);

    engine.setProvider(provider);
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  // ── State machine integration ─────────────────────────────────

  it('starts in LOADING after setProvider', () => {
    expect(engine.state).toBe(STATES.LOADING);
  });

  it('transitions to PLAYING when provider plays', () => {
    provider.emit(PROVIDER.READY, {});
    provider.play();
    expect(engine.state).toBe(STATES.PLAYING);
  });

  it('transitions to PAUSED when provider pauses', () => {
    provider.emit(PROVIDER.READY, {});
    provider.play();
    provider.pause();
    expect(engine.state).toBe(STATES.PAUSED);
  });

  // ── Controller outbound emission ──────────────────────────────

  it('controller: play event triggers outbound play', () => {
    provider.play();
    expect(outboundPlay).toHaveBeenCalledWith({ current_time: 0 });
  });

  it('controller: pause event triggers outbound pause', () => {
    provider.play();
    outboundPlay.mockClear();
    provider.pause();
    expect(outboundPause).toHaveBeenCalledWith({ current_time: 0 });
  });

  it('controller: rate change triggers outbound rate', () => {
    provider.setPlaybackRate(1.5);
    expect(outboundRate).toHaveBeenCalledWith({ playback_rate: 1.5 });
  });

  // ── Non-controller suppression ────────────────────────────────

  it('non-controller: play event does NOT trigger outbound', () => {
    engine.setIsController(false);
    provider.play();
    expect(outboundPlay).not.toHaveBeenCalled();
  });

  it('non-controller: pause event does NOT trigger outbound', () => {
    engine.setIsController(false);
    provider.pause();
    expect(outboundPause).not.toHaveBeenCalled();
  });

  // ── Sync guard: suppress echo ─────────────────────────────────

  it('applyPlay suppresses the echo play event', () => {
    engine.applyPlay(10);
    // The provider.play() inside applyPlay fires a play event,
    // but it must be suppressed (loop prevention)
    expect(outboundPlay).not.toHaveBeenCalled();
  });

  it('applyPause suppresses the echo pause event', () => {
    engine.applyPause(10);
    expect(outboundPause).not.toHaveBeenCalled();
  });

  it('applyPlay does not suppress pause — user can pause immediately after', () => {
    engine.applyPlay(0);
    outboundPlay.mockClear();
    // Simulate user pressing pause after sync (isSyncing cleared by seeked)
    // The mock seekTo fires statechange 3 → 1/2, clearing isSyncing
    provider.pause(); // genuine user action
    expect(outboundPause).toHaveBeenCalledOnce();
  });

  // ── Rate change suppression ───────────────────────────────────

  it('applyRate suppresses the echo ratechange event', () => {
    engine.applyRate(2);
    expect(outboundRate).not.toHaveBeenCalled();
  });

  // ── getSnapshot ───────────────────────────────────────────────

  it('getSnapshot returns current time and playing state', () => {
    provider._currentTime = 42;
    provider._playing = true;
    const snap = engine.getSnapshot();
    expect(snap.currentTime).toBe(42);
    expect(snap.isPlaying).toBe(true);
  });

  it('getSnapshot returns zeros when no provider', () => {
    engine.setProvider(null);
    const snap = engine.getSnapshot();
    expect(snap.currentTime).toBe(0);
    expect(snap.isPlaying).toBe(false);
  });

  // ── Provider swap ─────────────────────────────────────────────

  it('setProvider(null) detaches listeners — old provider events ignored', () => {
    engine.setProvider(null);
    provider.play();
    expect(outboundPlay).not.toHaveBeenCalled();
  });

  it('setProvider resets sync state', () => {
    engine.applyPlay(0);                       // sets isSyncing
    const newProvider = new MockProvider();
    engine.setProvider(newProvider);
    newProvider.play();                        // should emit (clean guard)
    expect(outboundPlay).toHaveBeenCalledOnce();
  });
});
