import { describe, it, expect } from 'vitest';
import validateFileMetadata from '../utils/validateFileMetadata';

// Reference metadata (the "controller" set this)
const reference = {
  filename: 'movie.mp4',
  size:     294221387,
  duration: 57.3,
  sha256:   'abc123def456abc123def456abc123def456abc123def456abc123def456abcd',
};

describe('validateFileMetadata', () => {

  // ── No reference ───────────────────────────────────────────────

  it('returns valid when expected is null (cannot validate)', () => {
    const { valid } = validateFileMetadata(reference, null);
    expect(valid).toBe(true);
  });

  it('returns valid when expected has no filename', () => {
    const { valid } = validateFileMetadata(reference, {});
    expect(valid).toBe(true);
  });

  // ── SHA-256 check ──────────────────────────────────────────────

  describe('SHA-256 fingerprint', () => {
    it('passes when hashes match', () => {
      const { valid } = validateFileMetadata(reference, reference);
      expect(valid).toBe(true);
    });

    it('fails on hash mismatch and returns immediately', () => {
      const extracted = { ...reference, sha256: 'different_hash' };
      const { valid, errors } = validateFileMetadata(extracted, reference);
      expect(valid).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/exact same file/i);
    });

    it('skips hash check when either hash is missing', () => {
      // Both missing hash but same size/duration → valid
      const noHash = { ...reference, sha256: null };
      const { valid } = validateFileMetadata(noHash, noHash);
      expect(valid).toBe(true);
    });
  });

  // ── Size check ─────────────────────────────────────────────────

  describe('file size (bytes)', () => {
    it('fails when size differs', () => {
      const extracted = { ...reference, sha256: null, size: 999999 };
      const expected  = { ...reference, sha256: null };
      const { valid, errors } = validateFileMetadata(extracted, expected);
      expect(valid).toBe(false);
      expect(errors[0]).toMatch(/size/i);
    });

    it('passes when size matches exactly', () => {
      const extracted = { ...reference, sha256: null };
      const { valid }  = validateFileMetadata(extracted, { ...reference, sha256: null });
      expect(valid).toBe(true);
    });
  });

  // ── Duration check ─────────────────────────────────────────────

  describe('duration tolerance (±2 seconds)', () => {
    it('passes when duration is within 2 seconds', () => {
      const extracted = { ...reference, sha256: null, duration: 58.5 }; // +1.2s
      const { valid } = validateFileMetadata(extracted, { ...reference, sha256: null });
      expect(valid).toBe(true);
    });

    it('passes at exactly 2 seconds difference', () => {
      const extracted = { ...reference, sha256: null, duration: 55.3 }; // -2.0s
      const { valid } = validateFileMetadata(extracted, { ...reference, sha256: null });
      expect(valid).toBe(true);
    });

    it('fails when duration differs by more than 2 seconds', () => {
      const extracted = { ...reference, sha256: null, duration: 100 };
      const { valid, errors } = validateFileMetadata(extracted, { ...reference, sha256: null });
      expect(valid).toBe(false);
      expect(errors[0]).toMatch(/duration/i);
    });
  });

  // ── Filename check ─────────────────────────────────────────────

  describe('filename', () => {
    it('fails when filename differs', () => {
      const extracted = { ...reference, sha256: null };
      const expected  = { ...reference, sha256: null, filename: 'other_movie.mp4' };
      const { valid } = validateFileMetadata(extracted, expected);
      expect(valid).toBe(false);
    });

    it('passes when filename matches', () => {
      const extracted = { ...reference, sha256: null };
      const { valid } = validateFileMetadata(extracted, { ...reference, sha256: null });
      expect(valid).toBe(true);
    });
  });

  // ── Multiple errors ────────────────────────────────────────────

  it('can accumulate multiple errors (size + duration + filename)', () => {
    const extracted = { filename: 'wrong.mkv', sha256: null, size: 1, duration: 999 };
    const expected  = { ...reference, sha256: null };
    const { valid, errors } = validateFileMetadata(extracted, expected);
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(1);
  });
});
