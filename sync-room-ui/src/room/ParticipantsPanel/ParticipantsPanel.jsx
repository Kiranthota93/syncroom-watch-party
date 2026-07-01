import { useState } from "react";
import PropTypes from "prop-types";
import nodeAPI from "../../services/api";
import { createLogger } from "../../utils/logger";
import "./ParticipantsPanel.css";

const log = createLogger("ParticipantsPanel");

const IconCrown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.5 19.5h17v2h-17v-2zm.83-3.5 1.42-8.11L10 11.5l2-7.5 2 7.5 4.25-3.61L19.67 16H4.33z"/>
  </svg>
);

const IconPlay = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

// ── Activity type metadata ────────────────────────────────────────────────────
const ACTIVITY_META = {
  room_created:             { icon: '🏠', cat: 'room',         accent: '#8b5cf6' },
  room_ended:               { icon: '🔴', cat: 'room',         accent: '#ef4444' },
  participant_joined:       { icon: '🟢', cat: 'participants',  accent: '#22c55e' },
  participant_rejoined:     { icon: '🟢', cat: 'participants',  accent: '#22c55e' },
  participant_left:         { icon: '🔴', cat: 'participants',  accent: '#ef4444' },
  participant_kicked:       { icon: '🚫', cat: 'participants',  accent: '#ef4444' },
  playback_play:            { icon: '▶',  cat: 'playback',     accent: '#a78bfa' },
  playback_pause:           { icon: '⏸',  cat: 'playback',     accent: '#a78bfa' },
  playback_seek:            { icon: '⏩',  cat: 'playback',     accent: '#a78bfa' },
  playback_rate_change:     { icon: '🔄',  cat: 'playback',     accent: '#a78bfa' },
  controller_transferred:   { icon: '🎮',  cat: 'room',         accent: '#a78bfa' },
  controller_auto_recovered:{ icon: '🎮',  cat: 'room',         accent: '#6b7280' },
  host_transferred:         { icon: '👑',  cat: 'room',         accent: '#facc15' },
  content_selected:         { icon: '🎬',  cat: 'room',         accent: '#60a5fa' },
};

const FILTER_TABS = [
  { id: 'all',          label: 'All'          },
  { id: 'participants', label: 'People'        },
  { id: 'playback',     label: 'Playback'      },
  { id: 'room',         label: 'Room'          },
];

ActivityTimeline.propTypes = {
  logs:       PropTypes.array,
  formatTime: PropTypes.func.isRequired,
};

function ActivityTimeline({ logs, formatTime }) {
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
    <div className="panel-section">
      <div className="activity-header">
        <h3>Activity</h3>
      </div>

      {/* Filter tabs */}
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
              <div
                className="timeline-icon"
                style={{ color: meta.accent }}
              >
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

// ─────────────────────────────────────────────────────────────────────────────

function ParticipantsPanel({ room, refreshRoom }) {
  const currentUser = JSON.parse(
    localStorage.getItem("syncroom_user")
  );

  const amIHost =
    currentUser?.participant_id === room.host_participant_id;

  const [openMenuId,   setOpenMenuId]   = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { type, participant_id }

  const closeMenu = () => { setOpenMenuId(null); setConfirmState(null); };

  const transferHost = async (target_participant_id) => {
    try {
      await nodeAPI.post("/rooms/transfer-host", {
        invite_token:          room.invite_token,
        participant_id:        currentUser.participant_id,
        target_participant_id,
      });
      closeMenu();
      refreshRoom();
    } catch (error) {
      log.error("transferHost failed", error);
      closeMenu();
    }
  };

  const kickParticipant = async (target_participant_id) => {
    try {
      await nodeAPI.post("/rooms/kick", {
        invite_token:          room.invite_token,
        participant_id:        currentUser.participant_id,
        target_participant_id,
      });
      closeMenu();
    } catch (error) {
      log.error("kickParticipant failed", error);
      closeMenu();
    }
  };

  const toggleMute = async (target_participant_id, currently_muted) => {
    try {
      await nodeAPI.post("/rooms/mute", {
        invite_token:          room.invite_token,
        participant_id:        currentUser.participant_id,
        target_participant_id,
        muted:                 !currently_muted,
      });
      closeMenu();
    } catch (error) {
      log.error("toggleMute failed", error);
      closeMenu();
    }
  };

  const transferController = async (target_participant_id) => {
    try {
      await nodeAPI.post("/rooms/transfer-controller", {
        invite_token:   room.invite_token,
        participant_id: currentUser.participant_id,
        target_participant_id,
      });
      closeMenu();
      refreshRoom();
    } catch (error) {
      log.error("transferController failed", error);
      closeMenu();
    }
  };

  const onlineParticipants =
    room.participants.filter(
      (participant) => participant.is_online
    );

  const sortedParticipants = [
    ...room.participants,
  ].sort((a, b) => {
    return (
      Number(b.is_online) -
      Number(a.is_online)
    );
  });

  const controller =
    room.participants.find(
      (participant) =>
        participant.participant_id ===
        room.controller_participant_id
    );

  const getContentLabel = () => {
    const type = room.content_source?.type;

    if (!type) return "Not Selected";
    if (type === "youtube") return "YouTube";
    if (type === "local_video") return "Local Video";

    return type;
  };

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    const diff =
      Math.floor(
        (Date.now() -
          new Date(date)) /
          60000
      );

    if (diff < 1) {
      return "just now";
    }

    if (diff < 60) {
      return `${diff} min ago`;
    }

    const hours =
      Math.floor(diff / 60);

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    const days =
      Math.floor(hours / 24);

    return `${days} day ago`;
  };

  return (
    <aside className="participants-panel">
      <div className="panel-section">
        <div className="panel-header">
          <h3>Participants</h3>

          <span className="participant-count">
            {room.participants.length}
          </span>
        </div>

        <div className="participant-list">
          {sortedParticipants.map(
            (participant) => {
              const isHost =
                participant.participant_id ===
                room.host_participant_id;

              const isController =
                participant.participant_id ===
                room.controller_participant_id;

              const isMe =
                participant.participant_id ===
                currentUser?.participant_id;

              const handRaised = participant.hand_raised;
              const isMuted    = participant.is_muted;

              return (
                <div
                  key={participant.participant_id}
                  className={`participant-item ${isMe ? "participant-me" : ""} ${!participant.is_online ? "participant-offline" : ""}`}
                >
                  <div className="avatar-wrapper">
                    <div className="avatar avatar-purple">
                      {participant.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className={`avatar-status ${participant.is_online ? "avatar-online" : "avatar-away"}`} />
                  </div>

                  <div className="participant-info">
                    <div className="participant-name-row">
                      <span className="participant-name">
                        {participant.display_name}
                      </span>
                      {isMe && <span className="you-tag">you</span>}
                      {handRaised && <span className="hand-raised-indicator" title="Hand raised">🙋</span>}
                      {isMuted    && <span className="muted-indicator"       title="Muted from chat">🔇</span>}
                    </div>

                    {(isHost || isController) && (
                      <div className="badges">
                        {isHost && (
                          <span className="badge host">
                            <IconCrown /> Host
                          </span>
                        )}
                        {isController && (
                          <span className="badge controller">
                            <IconPlay /> Controller
                          </span>
                        )}
                      </div>
                    )}

                    <small className="participant-time">
                      {participant.is_online
                        ? `Joined ${formatTime(participant.joined_at)}`
                        : "Offline"}
                    </small>
                  </div>

                  {amIHost && !isMe && (
                    <div className="participant-menu-wrap">
                      <button
                        className="participant-menu-btn"
                        onClick={() => setOpenMenuId(openMenuId === participant.participant_id ? null : participant.participant_id)}
                        aria-label="Participant actions"
                      >
                        ⋯
                      </button>
                      {openMenuId === participant.participant_id && (
                        <div className="participant-menu">
                          {confirmState?.participant_id === participant.participant_id ? (
                            // Inline confirm row — replaces window.confirm()
                            <div className="menu-confirm-row">
                              <span className="menu-confirm-label">
                                {confirmState.type === 'kick' ? 'Remove this participant?' : 'Transfer host role?'}
                              </span>
                              <div className="menu-confirm-btns">
                                <button
                                  className="menu-confirm-yes"
                                  onClick={() => confirmState.type === 'kick'
                                    ? kickParticipant(participant.participant_id)
                                    : transferHost(participant.participant_id)
                                  }
                                >
                                  Yes
                                </button>
                                <button className="menu-confirm-no" onClick={() => setConfirmState(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {!isController && participant.is_online && (
                                <button onClick={() => { closeMenu(); transferController(participant.participant_id); }}>
                                  🎮 Give Control
                                </button>
                              )}
                              {isController && participant.is_online && (
                                <button onClick={() => { closeMenu(); transferController(currentUser.participant_id); }}>
                                  🎮 Take Control Back
                                </button>
                              )}
                              {!isHost && (
                                <button onClick={() => setConfirmState({ type: 'host', participant_id: participant.participant_id })}>
                                  👑 Make Host
                                </button>
                              )}
                              <button onClick={() => toggleMute(participant.participant_id, participant.is_muted)}>
                                {participant.is_muted ? '🔊 Unmute Chat' : '🔇 Mute Chat'}
                              </button>
                              <button className="menu-kick" onClick={() => setConfirmState({ type: 'kick', participant_id: participant.participant_id })}>
                                🚫 Remove from Room
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="panel-section">
        <h3>Room Status</h3>

        <div className="status-chips">
          <div className="status-row">
            <span>Content</span>
            <span>{getContentLabel()}</span>
          </div>
          <div className="status-row">
            <span>Online</span>
            <span>{onlineParticipants.length} / {room.participants.length}</span>
          </div>
          <div className="status-row">
            <span>Controller</span>
            <span>{controller?.display_name || "—"}</span>
          </div>
        </div>
      </div>

      <ActivityTimeline logs={room.activity_logs} formatTime={formatTime} />
    </aside>
  );
}

ParticipantsPanel.propTypes = {
  refreshRoom: PropTypes.func.isRequired,

  room: PropTypes.shape({
    invite_token:
      PropTypes.string.isRequired,

    host_participant_id:
      PropTypes.string,

    controller_participant_id:
      PropTypes.string,

    host_name:
      PropTypes.string,

    content_source: PropTypes.shape({
      type: PropTypes.string,
      metadata: PropTypes.object,
    }),

    participants:
      PropTypes.arrayOf(
        PropTypes.shape({
          participant_id:
            PropTypes.string.isRequired,

          display_name:
            PropTypes.string,

          joined_at:
            PropTypes.string,

          is_online:
            PropTypes.bool,
        })
      ).isRequired,

    activity_logs:
      PropTypes.arrayOf(
        PropTypes.shape({
          message:
            PropTypes.string,

          created_at:
            PropTypes.string,
        })
      ),
  }).isRequired,
};

export default ParticipantsPanel;