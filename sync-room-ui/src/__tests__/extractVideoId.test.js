import { describe, it, expect } from 'vitest';
import extractVideoId from '../utils/extractVideoId';

const ID = 'dQw4w9WgXcQ'; // 11-char test ID

describe('extractVideoId', () => {

  // ── Valid URL formats ──────────────────────────────────────────

  it('extracts from standard watch URL', () => {
    expect(extractVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it('extracts from short youtu.be URL', () => {
    expect(extractVideoId(`https://youtu.be/${ID}`)).toBe(ID);
  });

  it('extracts from embed URL', () => {
    expect(extractVideoId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
  });

  it('extracts from shorts URL', () => {
    expect(extractVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
  });

  it('extracts from v/ URL', () => {
    expect(extractVideoId(`https://www.youtube.com/v/${ID}`)).toBe(ID);
  });

  it('handles extra query parameters', () => {
    expect(extractVideoId(`https://www.youtube.com/watch?v=${ID}&t=42s&list=PL123`)).toBe(ID);
  });

  it('handles youtu.be with query string', () => {
    expect(extractVideoId(`https://youtu.be/${ID}?t=10`)).toBe(ID);
  });

  // ── Bare ID ────────────────────────────────────────────────────

  it('accepts a bare 11-character video ID', () => {
    expect(extractVideoId(ID)).toBe(ID);
  });

  it('accepts a bare ID with surrounding whitespace', () => {
    expect(extractVideoId(`  ${ID}  `)).toBe(ID);
  });

  // ── Invalid / null inputs ──────────────────────────────────────

  it('returns null for a non-YouTube URL', () => {
    expect(extractVideoId('https://vimeo.com/123456789')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(extractVideoId(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(extractVideoId(undefined)).toBeNull();
  });

  it('returns null for a random string', () => {
    expect(extractVideoId('not a video id at all!')).toBeNull();
  });
});
