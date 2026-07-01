import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './RoomDashboard.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtElapsed = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
};

const fmtRemaining = (expiresAt) => {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const AVATAR_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#14b8a6'];
const avatarColor = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── Sub-sections ──────────────────────────────────────────────────────────────

function SessionSection({ room }) {
  const [elapsed, setElapsed] = useState(
    Date.now() - new Date(room.created_at)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - new Date(room.created_at));
    }, 1000);
    return () => clearInterval(id);
  }, [room.created_at]);

  return (
    <div className="db-section">
      <h4 className="db-section-title">Session</h4>

      <div className="db-stat-row">
        <span className="db-stat-label">Duration</span>
        <span className="db-timer">{fmtElapsed(elapsed)}</span>
      </div>

      <div className="db-stat-row">
        <span className="db-stat-label">Expires in</span>
        <span className={`db-stat-value ${fmtRemaining(room.expires_at) === 'Expired' ? 'db-expired' : ''}`}>
          {fmtRemaining(room.expires_at)}
        </span>
      </div>

      <div className="db-stat-row">
        <span className="db-stat-label">Room code</span>
        <span className="db-code">{room.room_code}</span>
      </div>
    </div>
  );
}

SessionSection.propTypes = {
  room: PropTypes.shape({
    created_at: PropTypes.string,
    expires_at: PropTypes.string,
    room_code:  PropTypes.string,
  }).isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────

function ParticipantsSection({ room }) {
  const all     = room.participants || [];
  const online  = all.filter((p) => p.is_online);
  const ready   = online.filter((p) => p.is_ready);
  const pct     = all.length > 0 ? (online.length / all.length) * 100 : 0;
  const readyPct = online.length > 0 ? (ready.length / online.length) * 100 : 0;

  return (
    <div className="db-section">
      <h4 className="db-section-title">Participants</h4>

      {/* Online bar */}
      <div className="db-stat-row">
        <span className="db-stat-label">Online</span>
        <span className="db-stat-value">{online.length} / {all.length}</span>
      </div>
      <div className="db-bar-track">
        <div className="db-bar-fill db-bar-online" style={{ width: `${pct}%` }} />
      </div>

      {/* Ready bar */}
      <div className="db-stat-row" style={{ marginTop: '10px' }}>
        <span className="db-stat-label">Ready</span>
        <span className="db-stat-value">{ready.length} / {online.length}</span>
      </div>
      <div className="db-bar-track">
        <div
          className={`db-bar-fill ${readyPct === 100 && online.length > 0 ? 'db-bar-all-ready' : 'db-bar-ready'}`}
          style={{ width: `${readyPct}%` }}
        />
      </div>

      {/* Per-person chips */}
      <div className="db-chips">
        {all.map((p) => (
          <div
            key={p.participant_id}
            className={`db-chip ${!p.is_online ? 'db-chip-offline' : ''}`}
            title={`${p.display_name}${p.is_ready ? ' · Ready' : ''}${!p.is_online ? ' · Offline' : ''}`}
          >
            <div
              className="db-chip-avatar"
              style={{ background: avatarColor(p.display_name) }}
            >
              {p.display_name?.charAt(0)?.toUpperCase()}
            </div>
            <span className="db-chip-name">{p.display_name}</span>
            {p.is_online && (
              <span className={`db-chip-ready ${p.is_ready ? 'db-chip-ready-on' : ''}`}>
                {p.is_ready ? '✓' : '·'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

ParticipantsSection.propTypes = {
  room: PropTypes.shape({
    participants: PropTypes.array,
  }).isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────

function ContentSection({ content_source }) {
  if (!content_source?.type) {
    return (
      <div className="db-section">
        <h4 className="db-section-title">Content</h4>
        <div className="db-no-content">No content selected yet</div>
      </div>
    );
  }

  const isYT    = content_source.type === 'youtube';
  const meta    = content_source.metadata || {};
  const videoId = meta.video_id;
  const title   = isYT
    ? (meta.title || videoId || 'YouTube Video')
    : (meta.filename || 'Local Video');

  return (
    <div className="db-section">
      <h4 className="db-section-title">Content</h4>

      <div className="db-content-card">
        {isYT && videoId ? (
          <img
            className="db-thumbnail"
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt="thumbnail"
          />
        ) : (
          <div className={`db-thumb-placeholder db-thumb-${content_source.type}`}>
            {isYT ? '▶' : '📁'}
          </div>
        )}

        <div className="db-content-info">
          <span className={`db-content-badge db-content-badge-${content_source.type}`}>
            {isYT ? 'YouTube' : 'Local'}
          </span>
          <p className="db-content-title">{title}</p>
          {!isYT && meta.size && (
            <span className="db-content-meta">
              {(meta.size / 1048576).toFixed(1)} MB
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

ContentSection.propTypes = {
  content_source: PropTypes.shape({
    type:     PropTypes.string,
    metadata: PropTypes.object,
  }),
};

// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_META = [
  { key: 'allow_chat',               label: 'Chat',              icon: '💬' },
  { key: 'allow_emoji_reactions',    label: 'Reactions',         icon: '😄' },
  { key: 'require_everyone_ready',   label: 'Require ready',     icon: '✅' },
  { key: 'allow_controller_requests',label: 'Control requests',  icon: '🎮' },
  { key: 'allow_local_video',        label: 'Local video',       icon: '📁' },
  { key: 'allow_youtube',            label: 'YouTube',           icon: '▶' },
];

function SettingsSection({ settings }) {
  if (!settings) return null;

  return (
    <div className="db-section">
      <h4 className="db-section-title">Room Settings</h4>
      <div className="db-settings-grid">
        {SETTINGS_META.map(({ key, label, icon }) => (
          <div
            key={key}
            className={`db-setting-chip ${settings[key] ? 'db-setting-on' : 'db-setting-off'}`}
          >
            <span className="db-setting-icon">{icon}</span>
            <span className="db-setting-label">{label}</span>
            <span className="db-setting-dot">{settings[key] ? '●' : '○'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

SettingsSection.propTypes = {
  settings: PropTypes.object,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function RoomDashboard({ room }) {
  return (
    <div className="room-dashboard">
      <SessionSection      room={room} />
      <ParticipantsSection room={room} />
      <ContentSection      content_source={room.content_source} />
      <SettingsSection     settings={room.settings} />
    </div>
  );
}

RoomDashboard.propTypes = {
  room: PropTypes.object.isRequired,
};
