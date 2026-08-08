import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import nodeAPI from '../../services/api';
import { createLogger } from '../../utils/logger';
import './RoomSettings.css';

const log = createLogger('RoomSettings');

const SETTING_ITEMS = [
  {
    key:   'allow_chat',
    label: 'Allow Chat',
    desc:  'Participants can send messages in the chat.',
  },
  {
    key:   'allow_emoji_reactions',
    label: 'Allow Emoji Reactions',
    desc:  'Participants can send floating emoji reactions.',
  },
  {
    key:   'require_everyone_ready',
    label: 'Require Everyone Ready',
    desc:  'Playback cannot start until all participants confirm ready.',
  },
  {
    key:   'allow_controller_requests',
    label: 'Allow Controller Requests',
    desc:  'Participants can request playback control from the host.',
  },
  {
    key:   'allow_local_video',
    label: 'Allow Local Video',
    desc:  'Participants can load local video files for playback.',
  },
  {
    key:   'allow_youtube',
    label: 'Allow YouTube',
    desc:  'Participants can stream YouTube videos.',
  },
  {
    key:   'allow_streamed_video',
    label: 'Allow Uploaded Video Streaming',
    desc:  'Host uploads a video once and everyone streams it from the server.',
  },
];

export default function RoomSettings({ room, onClose }) {
  const [settings, setSettings] = useState({
    allow_chat:                true,
    allow_emoji_reactions:     true,
    require_everyone_ready:    false,
    allow_controller_requests: true,
    allow_local_video:         true,
    allow_youtube:             true,
    allow_streamed_video:      true,
    ...(room.settings || {}),
  });
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [roomName, setRoomName] = useState(room.room_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Sync if room updates externally
  useEffect(() => {
    if (room.settings) {
      setSettings((prev) => ({ ...prev, ...room.settings }));
    }
  }, [room.settings]);

  useEffect(() => {
    setRoomName(room.room_name || "");
  }, [room.room_name]);

  const saveName = async () => {
    const trimmed = roomName.trim();
    if (!trimmed || trimmed === room.room_name) return;
    setNameSaving(true);
    setNameSaved(false);
    try {
      const user = JSON.parse(localStorage.getItem('syncroom_user') || '{}');
      await nodeAPI.patch('/rooms/settings', {
        invite_token:   room.invite_token,
        participant_id: user.participant_id,
        room_name:      trimmed,
      });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      log.error('Failed to rename room', err);
    } finally {
      setNameSaving(false);
    }
  };

  const toggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await save(updated);
  };

  const save = async (data) => {
    setSaving(true);
    setSaved(false);
    try {
      const user = JSON.parse(localStorage.getItem('syncroom_user') || '{}');
      await nodeAPI.patch('/rooms/settings', {
        invite_token:   room.invite_token,
        participant_id: user.participant_id,
        settings:       data,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      log.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="rs-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rs-panel" role="dialog" aria-label="Room Settings">
        <div className="rs-header">
          <div className="rs-header-left">
            <span className="rs-header-icon">⚙</span>
            <h2>Room Settings</h2>
          </div>
          <div className="rs-header-right">
            {saving && <span className="rs-status rs-saving">Saving…</span>}
            {saved  && <span className="rs-status rs-saved">✓ Saved</span>}
            <button className="rs-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <p className="rs-subtitle">
          Changes apply immediately to all participants.
        </p>

        <div className="rs-rename-row">
          <input
            type="text"
            className="rs-rename-input"
            value={roomName}
            maxLength={60}
            placeholder="Room name"
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
          />
          <button
            className="rs-rename-save"
            onClick={saveName}
            disabled={nameSaving || !roomName.trim() || roomName.trim() === room.room_name}
          >
            {nameSaving ? 'Saving…' : nameSaved ? '✓ Saved' : 'Rename'}
          </button>
        </div>

        <div className="rs-list">
          {SETTING_ITEMS.map(({ key, label, desc }) => (
            <div key={key} className="rs-item">
              <div className="rs-item-text">
                <span className="rs-item-label">{label}</span>
                <span className="rs-item-desc">{desc}</span>
              </div>
              <button
                className={`rs-toggle ${settings[key] ? 'rs-toggle-on' : ''}`}
                onClick={() => toggle(key)}
                role="switch"
                aria-checked={settings[key]}
                aria-label={label}
              >
                <span className="rs-toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

RoomSettings.propTypes = {
  room:    PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
