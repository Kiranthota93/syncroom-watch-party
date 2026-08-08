import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { MAX_PARTICIPANTS } from '../../constants/room';
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

const formatTime = (date) => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
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

      <div className="db-card db-card-grid">
        <div className="db-card-stat">
          <span className="db-card-label">Duration</span>
          <span className="db-timer">{fmtElapsed(elapsed)}</span>
        </div>
        <div className="db-card-stat">
          <span className="db-card-label">Expires in</span>
          <span className={`db-card-value ${fmtRemaining(room.expires_at) === 'Expired' ? 'db-expired' : ''}`}>
            {fmtRemaining(room.expires_at)}
          </span>
        </div>
        <div className="db-card-stat">
          <span className="db-card-label">Room code</span>
          <span className="db-code">{room.room_code}</span>
        </div>
        <div className="db-card-stat">
          <span className="db-card-label">Members</span>
          <span className="db-card-value">{room.participants?.length || 0} / {MAX_PARTICIPANTS}</span>
        </div>
      </div>
    </div>
  );
}

SessionSection.propTypes = {
  room: PropTypes.shape({
    created_at: PropTypes.string,
    expires_at: PropTypes.string,
    room_code:  PropTypes.string,
    participants: PropTypes.array,
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
        <div className="db-card db-content-empty-card">
          <span className="db-content-empty-icon">🎬</span>
          <div>
            <p className="db-content-empty-title">No content selected</p>
            <p className="db-content-empty-hint">Pick a source below the stage</p>
          </div>
        </div>
      </div>
    );
  }

  const isYT    = content_source.type === 'youtube';
  const meta    = content_source.metadata || {};
  const videoId = meta.video_id;
  const title   = isYT
    ? (meta.title || videoId || 'YouTube Video')
    : (meta.filename || meta.original_name || 'Video');

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
            {isYT ? 'YouTube' : content_source.type === 'streamed_local_video' ? 'Uploaded Video' : 'Local'}
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
  { key: 'allow_chat',               label: 'Chat' },
  { key: 'allow_emoji_reactions',    label: 'Reactions' },
  { key: 'require_everyone_ready',   label: 'Require ready' },
  { key: 'allow_controller_requests',label: 'Control requests' },
  { key: 'allow_local_video',        label: 'Local video' },
  { key: 'allow_youtube',            label: 'YouTube' },
  { key: 'allow_streamed_video',     label: 'Uploaded video' },
];

function SettingsSection({ settings }) {
  if (!settings) return null;

  return (
    <div className="db-section">
      <h4 className="db-section-title">Room Settings</h4>
      <div className="db-settings-list">
        {SETTINGS_META.map(({ key, label }) => (
          <div key={key} className="db-setting-row">
            <span className="db-setting-label">{label}</span>
            {/* Read-only display, mirrors RoomSettings — editing stays host-only there */}
            <span className={`db-switch ${settings[key] ? 'db-switch-on' : ''}`}>
              <span className="db-switch-thumb" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

SettingsSection.propTypes = {
  settings: PropTypes.object,
};

// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_META = {
  room_created:              { icon: '🏠', cat: 'room',         accent: '#8b5cf6' },
  room_ended:                { icon: '🔴', cat: 'room',         accent: '#ef4444' },
  participant_joined:        { icon: '🟢', cat: 'participants', accent: '#22c55e' },
  participant_rejoined:      { icon: '🟢', cat: 'participants', accent: '#22c55e' },
  participant_left:         { icon: '🔴', cat: 'participants',  accent: '#ef4444' },
  participant_kicked:       { icon: '🚫', cat: 'participants',  accent: '#ef4444' },
  playback_play:            { icon: '▶',  cat: 'playback',     accent: '#a78bfa' },
  playback_pause:           { icon: '⏸',  cat: 'playback',     accent: '#a78bfa' },
  playback_seek:            { icon: '⏩',  cat: 'playback',     accent: '#a78bfa' },
  playback_rate_change:     { icon: '🔄',  cat: 'playback',     accent: '#a78bfa' },
  controller_transferred:   { icon: '🎮',  cat: 'room',         accent: '#a78bfa' },
  controller_auto_recovered:{ icon: '🎮',  cat: 'room',         accent: '#6b7280' },
  host_transferred:         { icon: '👑',  cat: 'room',         accent: '#facc15' },
  host_muted:               { icon: '🔇',  cat: 'participants', accent: '#ef4444' },
  host_unmuted:             { icon: '🔊',  cat: 'participants', accent: '#22c55e' },
  content_selected:         { icon: '🎬',  cat: 'room',         accent: '#60a5fa' },
};

const FILTER_TABS = [
  { id: 'all',          label: 'All'      },
  { id: 'participants', label: 'People'   },
  { id: 'playback',     label: 'Playback' },
  { id: 'room',         label: 'Room'     },
];

function ActivitySection({ logs }) {
  const [filter, setFilter] = useState('all');
  const filtered = (logs || [])
    .slice()
    .reverse()
    .filter((a) => {
      if (filter === 'all') return true;
      return ACTIVITY_META[a.type]?.cat === filter;
    })
    .slice(0, 30);

  return (
    <div className="db-section">
      <h4 className="db-section-title">Activity</h4>

      <div className="activity-filters">
        {FILTER_TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`activity-filter-btn ${filter === id ? 'activity-filter-active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="activity-timeline">
        {filtered.length === 0 && (
          <div className="activity-empty">No events yet</div>
        )}
        {filtered.map((activity, i) => {
          const meta = ACTIVITY_META[activity.type] || { icon: '•', accent: '#4b5563' };
          return (
            <div key={activity.created_at + i} className="timeline-item">
              <div className="timeline-icon" style={{ color: meta.accent }}>
                {meta.icon}
              </div>
              <div className="timeline-body">
                <span className="timeline-msg">{activity.message}</span>
                <span className="timeline-time">{formatTime(activity.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

ActivitySection.propTypes = {
  logs: PropTypes.array,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function RoomDashboard({ room }) {
  return (
    <div className="room-dashboard">
      <SessionSection      room={room} />
      <ParticipantsSection room={room} />
      <ContentSection      content_source={room.content_source} />
      <SettingsSection     settings={room.settings} />
      <ActivitySection     logs={room.activity_logs} />
    </div>
  );
}

RoomDashboard.propTypes = {
  room: PropTypes.object.isRequired,
};
