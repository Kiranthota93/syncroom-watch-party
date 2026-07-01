import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlaybackStateMachine, { STATES } from '../content/engine/PlaybackStateMachine';

describe('PlaybackStateMachine', () => {
  let machine;

  beforeEach(() => {
    machine = new PlaybackStateMachine();
  });

  // ── Initial state ──────────────────────────────────────────────

  it('starts in IDLE', () => {
    expect(machine.state).toBe(STATES.IDLE);
  });

  // ── Valid transitions ──────────────────────────────────────────

  describe('valid transitions', () => {
    it('IDLE → LOADING', () => {
      expect(machine.transition(STATES.LOADING)).toBe(true);
      expect(machine.state).toBe(STATES.LOADING);
    });

    it('LOADING → READY', () => {
      machine.transition(STATES.LOADING);
      expect(machine.transition(STATES.READY)).toBe(true);
    });

    it('READY → PLAYING', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      expect(machine.transition(STATES.PLAYING)).toBe(true);
    });

    it('PLAYING → PAUSED', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      expect(machine.transition(STATES.PAUSED)).toBe(true);
    });

    it('PAUSED → PLAYING', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.transition(STATES.PAUSED);
      expect(machine.transition(STATES.PLAYING)).toBe(true);
    });

    it('any → IDLE (content reset)', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      expect(machine.transition(STATES.IDLE)).toBe(true);
      expect(machine.state).toBe(STATES.IDLE);
    });

    it('same-state transition is idempotent (returns true, state unchanged)', () => {
      expect(machine.transition(STATES.IDLE)).toBe(true);
      expect(machine.state).toBe(STATES.IDLE);
    });
  });

  // ── Invalid transitions ────────────────────────────────────────

  describe('invalid transitions', () => {
    it('IDLE → PLAYING is rejected', () => {
      expect(machine.transition(STATES.PLAYING)).toBe(false);
      expect(machine.state).toBe(STATES.IDLE); // unchanged
    });

    it('IDLE → PAUSED is rejected', () => {
      expect(machine.transition(STATES.PAUSED)).toBe(false);
    });

    it('LOADING → PLAYING is rejected', () => {
      machine.transition(STATES.LOADING);
      expect(machine.transition(STATES.PLAYING)).toBe(false);
    });

    it('ENDED → PAUSED is rejected', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.transition(STATES.ENDED);
      expect(machine.transition(STATES.PAUSED)).toBe(false);
    });
  });

  // ── Guards ────────────────────────────────────────────────────

  describe('canPlay()', () => {
    it('false from IDLE',    () => expect(machine.canPlay()).toBe(false));
    it('false from LOADING', () => { machine.transition(STATES.LOADING); expect(machine.canPlay()).toBe(false); });
    it('true from READY',    () => { machine.transition(STATES.LOADING); machine.transition(STATES.READY); expect(machine.canPlay()).toBe(true); });
    it('true from PAUSED',   () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.transition(STATES.PAUSED);
      expect(machine.canPlay()).toBe(true);
    });
    it('true from ENDED',    () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.transition(STATES.ENDED);
      expect(machine.canPlay()).toBe(true);
    });
  });

  describe('canPause()', () => {
    it('false from IDLE',    () => expect(machine.canPause()).toBe(false));
    it('true from PLAYING',  () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      expect(machine.canPause()).toBe(true);
    });
    it('false from PAUSED',  () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.transition(STATES.PAUSED);
      expect(machine.canPause()).toBe(false);
    });
  });

  describe('canSeek()', () => {
    it('false from IDLE',   () => expect(machine.canSeek()).toBe(false));
    it('true from PLAYING', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      expect(machine.canSeek()).toBe(true);
    });
    it('true from PAUSED',  () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.transition(STATES.PAUSED);
      expect(machine.canSeek()).toBe(true);
    });
  });

  // ── onChange listener ──────────────────────────────────────────

  describe('onChange', () => {
    it('fires with (newState, prevState) on valid transition', () => {
      const cb = vi.fn();
      machine.onChange(cb);
      machine.transition(STATES.LOADING);
      expect(cb).toHaveBeenCalledWith(STATES.LOADING, STATES.IDLE);
    });

    it('does NOT fire on invalid transition', () => {
      const cb = vi.fn();
      machine.onChange(cb);
      machine.transition(STATES.PLAYING); // invalid from IDLE
      expect(cb).not.toHaveBeenCalled();
    });

    it('unsubscribe stops the listener', () => {
      const cb = vi.fn();
      const unsub = machine.onChange(cb);
      unsub();
      machine.transition(STATES.LOADING);
      expect(cb).not.toHaveBeenCalled();
    });

    it('multiple listeners all fire', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      machine.onChange(cb1);
      machine.onChange(cb2);
      machine.transition(STATES.LOADING);
      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });
  });

  // ── reset ──────────────────────────────────────────────────────

  describe('reset', () => {
    it('returns to IDLE from any state', () => {
      machine.transition(STATES.LOADING);
      machine.transition(STATES.READY);
      machine.transition(STATES.PLAYING);
      machine.reset();
      expect(machine.state).toBe(STATES.IDLE);
    });

    it('notifies listeners when resetting from non-IDLE', () => {
      const cb = vi.fn();
      machine.onChange(cb);
      machine.transition(STATES.LOADING);
      cb.mockClear();
      machine.reset();
      expect(cb).toHaveBeenCalledWith(STATES.IDLE, STATES.LOADING);
    });
  });
});
