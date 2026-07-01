import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SeekDetector from '../content/engine/SeekDetector';

describe('SeekDetector', () => {
  let detector;
  let onSeekDetected;

  beforeEach(() => {
    vi.useFakeTimers();
    onSeekDetected = vi.fn();
    detector = new SeekDetector({ onSeekDetected });
  });

  afterEach(() => {
    detector.destroy();
    vi.useRealTimers();
  });

  // ── Real seek detection ────────────────────────────────────────

  it('fires after debounce when position changes by more than 1 second', () => {
    detector.handleBufferingStart(10);
    detector.handleBufferingEnd(20);          // 10s jump
    vi.advanceTimersByTime(200);              // SEEK_DEBOUNCE_MS
    expect(onSeekDetected).toHaveBeenCalledOnce();
  });

  it('does NOT fire for small position changes (≤ 1 second)', () => {
    detector.handleBufferingStart(10);
    detector.handleBufferingEnd(10.5);        // 0.5s — normal buffering
    vi.runAllTimers();
    expect(onSeekDetected).not.toHaveBeenCalled();
  });

  it('does NOT fire if handleBufferingEnd is called without a prior start', () => {
    detector.handleBufferingEnd(30);
    vi.runAllTimers();
    expect(onSeekDetected).not.toHaveBeenCalled();
  });

  // ── Debounce ───────────────────────────────────────────────────

  it('debounces rapid seeks — callback fires only once', () => {
    detector.handleBufferingStart(0);
    detector.handleBufferingEnd(10);
    // Second seek resets the debounce
    detector.handleBufferingStart(10);
    detector.handleBufferingEnd(20);
    vi.advanceTimersByTime(200);
    expect(onSeekDetected).toHaveBeenCalledOnce();
  });

  it('does not fire before debounce period elapses', () => {
    detector.handleBufferingStart(0);
    detector.handleBufferingEnd(10);
    vi.advanceTimersByTime(199);              // one ms short
    expect(onSeekDetected).not.toHaveBeenCalled();
  });

  // ── justSeeked ─────────────────────────────────────────────────

  it('justSeeked is true immediately after a real seek fires', () => {
    detector.handleBufferingStart(0);
    detector.handleBufferingEnd(10);
    vi.advanceTimersByTime(200);
    expect(detector.justSeeked).toBe(true);
  });

  it('justSeeked becomes false after JUST_SEEKED_MS', () => {
    detector.handleBufferingStart(0);
    detector.handleBufferingEnd(10);
    vi.runAllTimers();
    expect(detector.justSeeked).toBe(false);
  });

  it('justSeeked is false before any seek', () => {
    expect(detector.justSeeked).toBe(false);
  });

  // ── reset ──────────────────────────────────────────────────────

  it('reset prevents pending callback from firing', () => {
    detector.handleBufferingStart(0);
    detector.handleBufferingEnd(10);
    detector.reset();
    vi.runAllTimers();
    expect(onSeekDetected).not.toHaveBeenCalled();
  });

  it('reset clears justSeeked', () => {
    detector.handleBufferingStart(0);
    detector.handleBufferingEnd(10);
    vi.advanceTimersByTime(200);              // fires and sets justSeeked
    detector.reset();
    expect(detector.justSeeked).toBe(false);
  });
});
