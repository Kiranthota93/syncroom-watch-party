import { useState } from 'react';

const KEY = 'syncroom_prefs';

export const PREF_DEFAULTS = {
  displayName:   '',
  notifications: true,
  volume:        1,
  playbackSpeed: 1,
};

/** Read preferences synchronously — usable outside React. */
export function getPrefs() {
  try {
    return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...PREF_DEFAULTS };
  }
}

/** React hook — returns current prefs + updater that persists to localStorage. */
export function usePreferences() {
  const [prefs, setPrefsState] = useState(getPrefs);

  const setPrefs = (updates) => {
    const next = { ...prefs, ...updates };
    setPrefsState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* quota exceeded — ignore */ }
  };

  return { prefs, setPrefs };
}
