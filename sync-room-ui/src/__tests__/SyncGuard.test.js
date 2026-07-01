import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SyncGuard from '../content/engine/SyncGuard';

describe('SyncGuard', () => {
  let guard;

  beforeEach(() => {
    vi.useFakeTimers();
    guard = new SyncGuard();
  });

  afterEach(() => {
    guard.destroy();
    vi.useRealTimers();
  });

  // ── suppress / consume ─────────────────────────────────────────

  describe('suppress / consume', () => {
    it('consume returns true immediately after suppress', () => {
      guard.suppress('play');
      expect(guard.consume('play')).toBe(true);
    });

    it('consume clears the flag — second call returns false', () => {
      guard.suppress('play');
      guard.consume('play');
      expect(guard.consume('play')).toBe(false);
    });

    it('suppressing play does not block pause', () => {
      guard.suppress('play');
      expect(guard.consume('pause')).toBe(false);
      expect(guard.consume('play')).toBe(true);
    });

    it('consume on unknown event returns false', () => {
      expect(guard.consume('rate')).toBe(false);
    });

    it('flag expires after the given timeout', () => {
      guard.suppress('play', 100);
      vi.advanceTimersByTime(101);
      expect(guard.consume('play')).toBe(false);
    });

    it('flag survives before the timeout', () => {
      guard.suppress('play', 500);
      vi.advanceTimersByTime(499);
      expect(guard.consume('play')).toBe(true);
    });

    it('second suppress resets the timeout', () => {
      guard.suppress('play', 100);
      vi.advanceTimersByTime(80);
      guard.suppress('play', 100); // reset
      vi.advanceTimersByTime(80);  // 80ms into new window — should still be live
      expect(guard.consume('play')).toBe(true);
    });
  });

  // ── isSyncing ──────────────────────────────────────────────────

  describe('isSyncing', () => {
    it('is false by default', () => {
      expect(guard.isSyncing).toBe(false);
    });

    it('setSyncing sets it to true', () => {
      guard.setSyncing(500);
      expect(guard.isSyncing).toBe(true);
    });

    it('clearSyncing sets it to false immediately', () => {
      guard.setSyncing(500);
      guard.clearSyncing();
      expect(guard.isSyncing).toBe(false);
    });

    it('auto-clears after the timeout', () => {
      guard.setSyncing(300);
      vi.advanceTimersByTime(301);
      expect(guard.isSyncing).toBe(false);
    });

    it('is still true before the timeout', () => {
      guard.setSyncing(300);
      vi.advanceTimersByTime(299);
      expect(guard.isSyncing).toBe(true);
    });
  });

  // ── reset ──────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears suppress flags', () => {
      guard.suppress('play');
      guard.reset();
      expect(guard.consume('play')).toBe(false);
    });

    it('clears isSyncing', () => {
      guard.setSyncing(1000);
      guard.reset();
      expect(guard.isSyncing).toBe(false);
    });
  });
});
