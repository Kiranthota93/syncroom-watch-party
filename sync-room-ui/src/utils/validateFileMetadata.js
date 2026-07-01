/**
 * validateFileMetadata — compares a selected file's extracted metadata
 * against the expected metadata stored in content_source.metadata.
 *
 * Returns { valid: boolean, errors: string[] }
 *
 * Checks (in order of reliability):
 *   1. SHA-256 fingerprint  — if both present, most reliable
 *   2. File size (bytes)    — exact match
 *   3. Duration             — within ±2 seconds (floating-point varies by encoder)
 *   4. Filename             — last resort; different OS may rename files
 */
const validateFileMetadata = (extracted, expected) => {
  if (!expected || !expected.filename) {
    // No reference metadata yet (controller hasn't selected their file)
    return { valid: true, errors: [] };
  }

  const errors = [];

  // ── SHA-256 fingerprint (first 1 MB) ─────────────────────────
  if (extracted.sha256 && expected.sha256) {
    if (extracted.sha256 !== expected.sha256) {
      errors.push(
        "File content doesn't match. Select the exact same file as the controller."
      );
      // If hash differs, size and duration will also differ — no point checking more
      return { valid: false, errors };
    }
  }

  // ── File size (exact bytes) ───────────────────────────────────
  if (expected.size && extracted.size !== expected.size) {
    errors.push(
      `File size mismatch — expected ${expected.size} bytes, got ${extracted.size} bytes.`
    );
  }

  // ── Duration (±2 seconds tolerance) ──────────────────────────
  if (expected.duration && extracted.duration) {
    if (Math.abs(extracted.duration - expected.duration) > 2) {
      errors.push(
        `Duration mismatch — expected ~${fmt(expected.duration)}, got ~${fmt(extracted.duration)}.`
      );
    }
  }

  // ── Filename (informational, not a hard failure alone) ────────
  if (expected.filename && extracted.filename !== expected.filename) {
    errors.push(
      `Filename doesn't match — expected "${expected.filename}", got "${extracted.filename}". ` +
      "This may still be the correct file if it was renamed."
    );
  }

  return { valid: errors.length === 0, errors };
};

const fmt = (seconds) => {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  return `${m}:${String(s % 60).padStart(2,"0")}`;
};

export default validateFileMetadata;
