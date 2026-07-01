import { createLogger } from '../../utils/logger';

const log = createLogger('PlaybackStateMachine');

/**
 * Playback state values.
 * Exported so PlaybackEngine and UI components can reference them without
 * importing the full machine.
 */
export const STATES = Object.freeze({
  IDLE:      'idle',
  LOADING:   'loading',
  READY:     'ready',
  PLAYING:   'playing',
  PAUSED:    'paused',
  BUFFERING: 'buffering',
  ENDED:     'ended',
  ERROR:     'error',
});

/**
 * Valid target states reachable from each state.
 * Transitions not listed here are illegal.
 */
const TRANSITIONS = Object.freeze({
  [STATES.IDLE]:      [STATES.LOADING, STATES.READY, STATES.IDLE],
  [STATES.LOADING]:   [STATES.READY, STATES.ERROR, STATES.IDLE],
  [STATES.READY]:     [STATES.PLAYING, STATES.PAUSED, STATES.BUFFERING, STATES.ERROR, STATES.IDLE],
  [STATES.PLAYING]:   [STATES.PAUSED, STATES.BUFFERING, STATES.ENDED, STATES.ERROR, STATES.IDLE, STATES.READY],
  [STATES.PAUSED]:    [STATES.PLAYING, STATES.BUFFERING, STATES.ENDED, STATES.ERROR, STATES.IDLE, STATES.READY],
  [STATES.BUFFERING]: [STATES.PLAYING, STATES.PAUSED, STATES.ERROR, STATES.IDLE],
  [STATES.ENDED]:     [STATES.PLAYING, STATES.IDLE, STATES.READY],
  [STATES.ERROR]:     [STATES.IDLE, STATES.LOADING, STATES.READY],
});

/** States from which play() is a valid user action. */
const CAN_PLAY_FROM  = new Set([STATES.READY, STATES.PAUSED, STATES.BUFFERING, STATES.ENDED]);

/** States from which pause() is a valid user action. */
const CAN_PAUSE_FROM = new Set([STATES.PLAYING, STATES.BUFFERING]);

/** States from which seek() is a valid user action. */
const CAN_SEEK_FROM  = new Set([STATES.READY, STATES.PLAYING, STATES.PAUSED, STATES.BUFFERING]);

/**
 * PlaybackStateMachine — formal state machine for client-side playback state.
 *
 * Responsibilities:
 *   - Track current playback state
 *   - Validate transitions and log warnings on illegal ones
 *   - Expose guards (canPlay, canPause, canSeek) for UI and engine use
 *   - Notify listeners on state change
 *
 * This machine does NOT call provider methods — that is the engine's job.
 * It is a pure state tracker that observes and validates.
 */
class PlaybackStateMachine {
  constructor() {
    this._state     = STATES.IDLE;
    this._listeners = [];
  }

  // ── State access ──────────────────────────────────────────────

  get state() { return this._state; }

  get isIdle()      { return this._state === STATES.IDLE; }
  get isPlaying()   { return this._state === STATES.PLAYING; }
  get isPaused()    { return this._state === STATES.PAUSED; }
  get isBuffering() { return this._state === STATES.BUFFERING; }
  get isEnded()     { return this._state === STATES.ENDED; }
  get isError()     { return this._state === STATES.ERROR; }
  get isReady()     { return this._state === STATES.READY || this._state === STATES.PLAYING || this._state === STATES.PAUSED; }

  // ── Guards ────────────────────────────────────────────────────

  canPlay()  { return CAN_PLAY_FROM.has(this._state);  }
  canPause() { return CAN_PAUSE_FROM.has(this._state); }
  canSeek()  { return CAN_SEEK_FROM.has(this._state);  }

  // ── Transitions ───────────────────────────────────────────────

  /**
   * Attempt a transition to `newState`.
   * Logs a warning if the transition is invalid but does NOT throw —
   * a stale or out-of-order provider event should never crash playback.
   *
   * @returns {boolean} true if the transition was applied
   */
  transition(newState) {
    if (this._state === newState) return true; // idempotent

    const allowed = TRANSITIONS[this._state];
    if (!allowed?.includes(newState)) {
      log.warn(`Invalid transition: ${this._state} → ${newState}`);
      return false;
    }

    const prev = this._state;
    this._state = newState;

    log.debug(`State: ${prev} → ${newState}`);

    this._listeners.forEach((fn) => fn(newState, prev));
    return true;
  }

  // ── Listener registration ─────────────────────────────────────

  /**
   * Register a callback that fires on every successful state transition.
   * @param {Function} fn — called with (newState, prevState)
   * @returns {Function} unsubscribe function
   */
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((f) => f !== fn);
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  reset() {
    const prev    = this._state;
    this._state   = STATES.IDLE;
    if (prev !== STATES.IDLE) {
      this._listeners.forEach((fn) => fn(STATES.IDLE, prev));
    }
  }

  destroy() {
    this._listeners = [];
  }
}

export default PlaybackStateMachine;
