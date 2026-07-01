import { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { usePreferences } from '../../hooks/usePreferences';
import './PreferencesModal.css';

const SPEEDS = [
  { value: 0.5,  label: '0.5×' },
  { value: 0.75, label: '0.75×' },
  { value: 1,    label: '1× (Normal)' },
  { value: 1.25, label: '1.25×' },
  { value: 1.5,  label: '1.5×' },
  { value: 2,    label: '2×' },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`pref-toggle ${checked ? 'pref-toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="pref-toggle-thumb" />
    </button>
  );
}

Toggle.propTypes = {
  checked:  PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

function PreferencesModal({ onClose }) {
  const { prefs, setPrefs } = usePreferences();

  // Local draft — committed on Save
  const [draft, setDraft] = useState({ ...prefs });

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    setPrefs(draft);
    onClose();
  };

  return createPortal(
    <div className="pref-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pref-modal" role="dialog" aria-label="Preferences">
        <div className="pref-header">
          <div className="pref-title">
            <span className="pref-title-icon">⚙</span>
            Preferences
          </div>
          <button className="pref-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="pref-body">

          {/* ── Profile ── */}
          <section className="pref-section">
            <h4 className="pref-section-title">Profile</h4>

            <div className="pref-row pref-row-col">
              <label className="pref-label" htmlFor="pref-name">
                Default Display Name
              </label>
              <input
                id="pref-name"
                className="pref-input"
                type="text"
                placeholder="Your name (pre-filled on create / join)"
                value={draft.displayName}
                maxLength={30}
                onChange={(e) => set('displayName', e.target.value)}
              />
              <span className="pref-hint">
                Pre-fills the name field when you create or join a room.
              </span>
            </div>
          </section>

          {/* ── Notifications ── */}
          <section className="pref-section">
            <h4 className="pref-section-title">Notifications</h4>

            <div className="pref-row">
              <div className="pref-row-left">
                <span className="pref-row-label">Show room notifications</span>
                <span className="pref-hint">
                  Toast alerts for joins, leaves, controller changes, etc.
                </span>
              </div>
              <Toggle
                checked={draft.notifications}
                onChange={(v) => set('notifications', v)}
              />
            </div>
          </section>

          {/* ── Player ── */}
          <section className="pref-section">
            <h4 className="pref-section-title">Player</h4>

            <div className="pref-row">
              <div className="pref-row-left">
                <span className="pref-row-label">Default Volume</span>
                <span className="pref-hint">{Math.round(draft.volume * 100)}%</span>
              </div>
              <input
                type="range"
                className="pref-range"
                min={0} max={1} step={0.01}
                value={draft.volume}
                onChange={(e) => set('volume', parseFloat(e.target.value))}
              />
            </div>

            <div className="pref-row pref-row-col">
              <label className="pref-label" htmlFor="pref-speed">
                Default Playback Speed
              </label>
              <select
                id="pref-speed"
                className="pref-select"
                value={draft.playbackSpeed}
                onChange={(e) => set('playbackSpeed', parseFloat(e.target.value))}
              >
                {SPEEDS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* ── Theme (locked) ── */}
          <section className="pref-section">
            <h4 className="pref-section-title">Appearance</h4>
            <div className="pref-row">
              <div className="pref-row-left">
                <span className="pref-row-label">Theme</span>
                <span className="pref-hint">More themes coming soon</span>
              </div>
              <span className="pref-badge">🌙 Dark</span>
            </div>
          </section>

        </div>

        <div className="pref-footer">
          <button className="pref-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="pref-save-btn" onClick={handleSave}>Save preferences</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

PreferencesModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default PreferencesModal;
