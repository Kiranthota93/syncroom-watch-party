import { useState } from "react";
import PropTypes from "prop-types";
import nodeAPI from "../../services/api";
import socket from "../../socket/socket";
import { SOCKET } from "../../constants/events";
import { createLogger } from "../../utils/logger";
import { IconMic, IconMicOff, IconCamera, IconCameraOff } from "../../components/icons";
import { MAX_PARTICIPANTS } from "../../constants/room";
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

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconUserPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

function ParticipantsPanel({ room, refreshRoom }) {
  const currentUser = JSON.parse(
    localStorage.getItem("syncroom_user")
  );

  const amIHost =
    currentUser?.participant_id === room.host_participant_id;

  const [openMenuId,   setOpenMenuId]   = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { type, participant_id }
  const [search,        setSearch]      = useState("");
  const [inviteCopied,  setInviteCopied] = useState(false);
  const [pinnedIds,     setPinnedIds]    = useState(() => new Set()); // local-only, this device's view

  const closeMenu = () => { setOpenMenuId(null); setConfirmState(null); };

  // Local-only — pins a participant to the top of this device's list.
  const togglePin = (participant_id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      next.has(participant_id) ? next.delete(participant_id) : next.add(participant_id);
      return next;
    });
    closeMenu();
  };

  // Ephemeral attention-getter — no persistence, just relayed to the target.
  const pingParticipant = (target_participant_id) => {
    socket.emit(SOCKET.PARTICIPANT_PING, {
      invite_token: room.invite_token,
      target_participant_id,
    });
    closeMenu();
  };

  const copyInvite = async () => {
    try {
      const invite_link = `${window.location.origin}/join-room?invite_token=${room.invite_token}`;
      await navigator.clipboard.writeText(invite_link);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (error) {
      log.error("copyInvite failed", error);
    }
  };

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

  const sortedParticipants = [
    ...room.participants,
  ].sort((a, b) => {
    const pinDiff = Number(pinnedIds.has(b.participant_id)) - Number(pinnedIds.has(a.participant_id));
    if (pinDiff !== 0) return pinDiff;
    return (
      Number(b.is_online) -
      Number(a.is_online)
    );
  });

  const query = search.trim().toLowerCase();
  const filteredParticipants = query
    ? sortedParticipants.filter((p) => p.display_name?.toLowerCase().includes(query))
    : sortedParticipants;

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
          <span className="participant-count-label">
            {room.participants.length} / {MAX_PARTICIPANTS} in room
          </span>

          <button className="pp-invite-btn" onClick={copyInvite}>
            <IconUserPlus /> {inviteCopied ? "Copied!" : "Invite"}
          </button>
        </div>

        <div className="pp-search-wrap">
          <IconSearch />
          <input
            type="text"
            className="pp-search-input"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="participant-list">
          {filteredParticipants.map(
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
                      {pinnedIds.has(participant.participant_id) && <span className="pin-indicator" title="Pinned">📌</span>}
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

                  <div className="participant-call-icons">
                    <span className={`pp-call-icon ${participant.mic_on ? "pp-call-icon-on" : ""}`}>
                      {participant.mic_on ? <IconMic size={13} /> : <IconMicOff size={13} />}
                    </span>
                    <span className={`pp-call-icon ${participant.cam_on ? "pp-call-icon-on" : ""}`}>
                      {participant.cam_on ? <IconCamera size={13} /> : <IconCameraOff size={13} />}
                    </span>
                  </div>

                  {!isMe && (
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
                              {participant.is_online && (
                                <button onClick={() => pingParticipant(participant.participant_id)}>
                                  🔔 Ping
                                </button>
                              )}
                              <button onClick={() => togglePin(participant.participant_id)}>
                                📌 {pinnedIds.has(participant.participant_id) ? 'Unpin' : 'Pin'}
                              </button>

                              {amIHost && (
                                <>
                                  <div className="participant-menu-divider" />
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

          mic_on: PropTypes.bool,
          cam_on: PropTypes.bool,
        })
      ).isRequired,
  }).isRequired,
};

export default ParticipantsPanel;
