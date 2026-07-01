import { describe, it, expect, vi, beforeEach } from 'vitest';
import MediaProvider from '../content/providers/MediaProvider';

describe('MediaProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new MediaProvider();
  });

  // ── Event system ───────────────────────────────────────────────

  describe('event system', () => {
    it('on + emit calls the registered handler with data', () => {
      const cb = vi.fn();
      provider.on('play', cb);
      provider.emit('play', { currentTime: 5 });
      expect(cb).toHaveBeenCalledWith({ currentTime: 5 });
    });

    it('multiple listeners on the same event all fire', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      provider.on('play', cb1);
      provider.on('play', cb2);
      provider.emit('play', { currentTime: 0 });
      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('off removes the specific listener', () => {
      const cb = vi.fn();
      provider.on('pause', cb);
      provider.off('pause', cb);
      provider.emit('pause', {});
      expect(cb).not.toHaveBeenCalled();
    });

    it('off does not remove other listeners on the same event', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      provider.on('pause', cb1);
      provider.on('pause', cb2);
      provider.off('pause', cb1);
      provider.emit('pause', {});
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('emit on an event with no listeners does not throw', () => {
      expect(() => provider.emit('statechange', { state: 1 })).not.toThrow();
    });

    it('emit on an unknown event does not throw', () => {
      expect(() => provider.emit('nonexistent')).not.toThrow();
    });

    it('on returns this (chainable)', () => {
      const result = provider.on('play', () => {});
      expect(result).toBe(provider);
    });

    it('off returns this (chainable)', () => {
      const cb = () => {};
      provider.on('play', cb);
      expect(provider.off('play', cb)).toBe(provider);
    });

    it('off with a handler that was never registered does not throw', () => {
      expect(() => provider.off('play', () => {})).not.toThrow();
    });

    it('destroy clears all listeners — emit does nothing after destroy', () => {
      const cb = vi.fn();
      provider.on('play', cb);
      provider.destroy();
      provider.emit('play', { currentTime: 0 });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── Default state methods (must be overridden by subclasses) ──

  describe('default implementations', () => {
    it('getCurrentTime returns 0',    () => expect(provider.getCurrentTime()).toBe(0));
    it('getDuration returns 0',       () => expect(provider.getDuration()).toBe(0));
    it('isReady returns false',       () => expect(provider.isReady()).toBe(false));
    it('isPlaying returns false',     () => expect(provider.isPlaying()).toBe(false));
    it('isBuffering returns false',   () => expect(provider.isBuffering()).toBe(false));
    it("getState returns 'idle'",     () => expect(provider.getState()).toBe('idle'));
    it('play does not throw',         () => expect(() => provider.play()).not.toThrow());
    it('pause does not throw',        () => expect(() => provider.pause()).not.toThrow());
    it('seekTo does not throw',       () => expect(() => provider.seekTo(30)).not.toThrow());
    it('setPlaybackRate does not throw', () => expect(() => provider.setPlaybackRate(1.5)).not.toThrow());
  });
});
