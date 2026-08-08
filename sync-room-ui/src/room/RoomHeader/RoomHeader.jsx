import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

import nodeAPI from "../../services/api";
import socket from "../../socket/socket";
import { SOCKET } from "../../constants/events";
import { createLogger } from "../../utils/logger";
import RoomSettings from "../RoomSettings/RoomSettings";

const log = createLogger("RoomHeader");

import "./RoomHeader.css";

const IconCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const IconLink = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const IconLogOut = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconVideo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);

const IconPeople = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTheater = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);

const IconTheaterExit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="2" y1="9" x2="22" y2="9" />
  </svg>
);

const IconMore = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
  </svg>
);

const IconUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function RoomHeader({
  room, refreshRoom, connected, theater, onToggleTheater, streamedUpload,
  onOpenPreferences, onOpenCameras, onOpenParticipants,
}) {
  const navigate = useNavigate();

  const [showHostLeaveDialog,  setShowHostLeaveDialog]  = useState(false);
  const [showSettings,         setShowSettings]         = useState(false);
  const [toast,                setToast]                = useState(null);
  const [handRaising,          setHandRaising]          = useState(false);
  const [controllerRequest,    setControllerRequest]    = useState(null); // { participant_id, display_name, invite_token }
  const [requestSent,          setRequestSent]          = useState(false);
  const [pauseRequest,         setPauseRequest]         = useState(null); // { participant_id, display_name }
  const [pauseRequestSent,     setPauseRequestSent]     = useState(false);
  const [menuOpen,             setMenuOpen]             = useState(false);
  const [sourceMenuOpen,       setSourceMenuOpen]       = useState(false);

  const menuRef = useRef(null);
  const sourceMenuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Current source is surfaced as its own chip next to the room name — not
  // just tucked behind "•••" — after a user couldn't find any way to change
  // source and mistook the overflow icon's menu for something else entirely.
  useEffect(() => {
    if (!sourceMenuOpen) return;
    const onDown = (e) => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target)) setSourceMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setSourceMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sourceMenuOpen]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Surface streamed-upload failures the same way as every other header
  // action, since the upload trigger now lives here.
  useEffect(() => {
    if (!streamedUpload.error) return;
    showToast(streamedUpload.error, "error");
    streamedUpload.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamedUpload.error]);

  const currentUser = JSON.parse(
    localStorage.getItem("syncroom_user") || "{}"
  );

  const amIHost =
    currentUser?.participant_id === room.host_participant_id;

  const amIController =
    currentUser?.participant_id === room.controller_participant_id;

  const online_users =
    room.participants?.filter(
      (participant) =>
        participant.is_online
    ).length || 0;

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      showToast("Room code copied");
    } catch (error) {
      log.error("RoomHeader action failed", error);
      showToast("Unable to copy room code", "error");
    }
  };

  const copyInvite = async () => {
    try {
      const invite_link = `${window.location.origin}/join-room?invite_token=${room.invite_token}`;
      await navigator.clipboard.writeText(invite_link);
      showToast("Invite link copied");
    } catch (error) {
      log.error("RoomHeader action failed", error);
      showToast("Unable to copy invite link", "error");
    }
  };

  // Called after confirmation from the Leave button's host dialog
  const doEndRoom = async () => {
    setShowHostLeaveDialog(false);
    try {
      await nodeAPI.post("/rooms/end", {
        invite_token:   room.invite_token,
        participant_id: currentUser.participant_id,
      });
      localStorage.removeItem("syncroom_user");
      navigate("/");
    } catch (error) {
      showToast(error?.response?.data?.message || "Unable to end room", "error");
    }
  };

  // Host: listen for incoming controller requests
  useEffect(() => {
    if (!amIHost) return;
    const onRequest = (data) => setControllerRequest(data);
    socket.on(SOCKET.CONTROLLER_REQUEST_NOTIFY, onRequest);
    return () => socket.off(SOCKET.CONTROLLER_REQUEST_NOTIFY, onRequest);
  }, [amIHost]);

  // Controller: listen for "someone wants to talk, please pause" requests
  useEffect(() => {
    if (!amIController) return;
    const onPauseRequest = (data) => setPauseRequest(data);
    socket.on(SOCKET.PLAYBACK_PAUSE_REQUEST_NOTIFY, onPauseRequest);
    return () => socket.off(SOCKET.PLAYBACK_PAUSE_REQUEST_NOTIFY, onPauseRequest);
  }, [amIController]);

  // Auto-dismiss controller request if the requester goes offline
  useEffect(() => {
    if (!controllerRequest) return;
    const requester = room.participants?.find(
      (p) => p.participant_id === controllerRequest.participant_id
    );
    if (!requester || !requester.is_online) setControllerRequest(null);
  }, [room, controllerRequest]);

  // ── Controller request handling ───────────────────────────────

  const requestControl = () => {
    if (requestSent) return;
    socket.emit(SOCKET.CONTROLLER_REQUEST, {
      invite_token:   room.invite_token,
      participant_id: currentUser?.participant_id,
    });
    setRequestSent(true);
    setTimeout(() => setRequestSent(false), 10000); // cooldown 10s
    showToast("Request sent to host", "success");
  };

  const approveControllerRequest = async () => {
    if (!controllerRequest) return;
    try {
      await nodeAPI.post("/rooms/transfer-controller", {
        invite_token:          room.invite_token,
        participant_id:        currentUser?.participant_id,
        target_participant_id: controllerRequest.participant_id,
      });
      showToast(`Control given to ${controllerRequest.display_name}`, "success");
    } catch (err) {
      showToast("Failed to transfer controller", "error");
    } finally {
      setControllerRequest(null);
    }
  };

  // ── Watch/Social mode: "please pause so I can talk" ──────────

  const isPlaying = room.playback_state?.status === "playing";

  const requestPause = () => {
    if (pauseRequestSent) return;
    socket.emit(SOCKET.PLAYBACK_PAUSE_REQUEST, {
      invite_token:   room.invite_token,
      participant_id: currentUser?.participant_id,
    });
    setPauseRequestSent(true);
    setTimeout(() => setPauseRequestSent(false), 10000); // cooldown 10s
    showToast("Request sent to host", "success");
  };

  const pauseNow = () => {
    socket.emit(SOCKET.PLAYBACK_PAUSE, {
      invite_token: room.invite_token,
      current_time: room.playback_state?.current_time || 0,
    });
    setPauseRequest(null);
  };

  const myParticipant   = room.participants?.find(
    (p) => p.participant_id === currentUser?.participant_id
  );
  const isHandRaised = myParticipant?.hand_raised || false;

  const toggleHand = async () => {
    if (handRaising) return;
    setHandRaising(true);
    try {
      await nodeAPI.post("/rooms/raise-hand", {
        invite_token:   room.invite_token,
        participant_id: currentUser.participant_id,
        raised:         !isHandRaised,
      });
    } catch (err) {
      showToast("Failed to update hand status", "error");
    } finally {
      setHandRaising(false);
    }
  };

  // Source switching lives in its own chip next to the room name — it used to
  // be a persistent full-width bar under the video, then got folded into the
  // "•••" overflow menu, but that made it undiscoverable (the whole point of
  // this control is that it needs to be found).
  const currentSource = room.content_source?.type;

  const SOURCES = [
    { type: "youtube",     label: "YouTube",     allowed: room.settings?.allow_youtube !== false },
    { type: "local_video", label: "Local Video", allowed: room.settings?.allow_local_video !== false },
  ];
  const streamedAllowed = room.settings?.allow_streamed_video !== false;

  const SOURCE_LABELS = { youtube: "YouTube", local_video: "Local Video", streamed_local_video: "Streaming" };
  const sourceLabel = streamedUpload.uploading
    ? `Uploading… ${streamedUpload.progress}%`
    : SOURCE_LABELS[currentSource] || "No source";

  const selectSource = async (type) => {
    setSourceMenuOpen(false);
    if (type === currentSource) return;
    try {
      await nodeAPI.post("/rooms/content", {
        room_code:      room.room_code,
        participant_id: currentUser.participant_id,
        content_source: { type, metadata: {} },
      });
      refreshRoom();
    } catch (error) {
      log.error("Content source update failed", error);
      showToast("Failed to change source", "error");
    }
  };

  // Streamed video has no plain "select" step (it needs a file) — clicking
  // opens the browser's file picker instead. This was previously reachable
  // *only* from VideoStage's empty state, so once you'd switched to another
  // source, or wanted to replace the video you were streaming, there was no
  // way back in — the exact "can't change source" gap.
  const streamedFileInputRef = useRef(null);

  const handleStreamedFileChosen = (e) => {
    const file = e.target.files[0];
    setSourceMenuOpen(false);
    e.target.value = ""; // allow re-choosing the same filename next time
    if (file) streamedUpload.upload(file);
  };

  const handleLeaveClick = () => {
    if (amIHost) {
      setShowHostLeaveDialog(true);
    } else {
      leaveRoom();
    }
  };

  const leaveRoom = async () => {
    await doLeave();
  };

  const justLeave = async () => {
    setShowHostLeaveDialog(false);
    await doLeave();
  };

  const doLeave = async () => {
    try {
      await nodeAPI.post("/rooms/leave", {
        invite_token: room.invite_token,
        participant_id: currentUser.participant_id,
      });

      localStorage.removeItem("syncroom_user");
      navigate("/");
    } catch (error) {
      showToast(error?.response?.data?.message || "Unable to leave room", "error");
    }
  };

  return (
    <>
    <header className="room-header">
      <div className="room-header-left">
        <div className="room-logo">
          <div className="room-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <polygon points="6 3 21 12 6 21 6 3"/>
            </svg>
          </div>

          <span>SyncRoom</span>
        </div>

        <div className="room-divider" />

        <h3 className="room-name">
          {room.room_name} ·{" "}
          {room.room_code}
        </h3>

        <div className="room-code">
          {/* {room.room_code} */}

          <button
            className="copy-btn"
            onClick={copyRoomCode}
            title="Copy Room Code"
          >
            <IconCopy />
          </button>
        </div>

        {/* Always-visible current source + the only place to change it — this
            used to be buried behind the unlabeled "•••" menu, which is how a
            user testing the room couldn't find any way to change source at
            all. */}
        <div className="source-chip-anchor" ref={sourceMenuRef}>
          {amIController ? (
            <button
              className={`source-chip ${sourceMenuOpen ? 'source-chip-open' : ''}`}
              onClick={() => setSourceMenuOpen((v) => !v)}
              aria-expanded={sourceMenuOpen}
              aria-haspopup="menu"
              title="Change content source"
            >
              {sourceLabel}
              <IconChevronDown />
            </button>
          ) : (
            <span className="source-chip source-chip-readonly" title="Only the controller can change the source">
              {sourceLabel}
            </span>
          )}

          {sourceMenuOpen && amIController && (
            <div className="header-menu source-menu" role="menu">
              {SOURCES.filter((s) => s.allowed).map((s) => (
                <button
                  key={s.type}
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => selectSource(s.type)}
                >
                  {s.label}
                  {currentSource === s.type && <span className="header-menu-check">✓</span>}
                </button>
              ))}

              {streamedAllowed && (
                <label
                  className={`header-menu-item ${streamedUpload.uploading ? "header-menu-item-disabled" : ""}`}
                  role="menuitem"
                >
                  <IconUpload />
                  {streamedUpload.uploading
                    ? `Uploading… ${streamedUpload.progress}%`
                    : currentSource === "streamed_local_video" ? "Replace video" : "Upload video"}
                  {currentSource === "streamed_local_video" && !streamedUpload.uploading && (
                    <span className="header-menu-check">✓</span>
                  )}
                  <input
                    ref={streamedFileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleStreamedFileChosen}
                    disabled={streamedUpload.uploading}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="room-header-right">
        {/* Status compresses to a dot while healthy; it only spells itself out
            when something is wrong, which is when it actually needs attention. */}
        <div
          className={`connection-status ${!connected ? "connection-status-disconnected" : ""}`}
          title={connected ? `Connected · ${online_users} online` : "Reconnecting…"}
        >
          <span className={`status-dot ${!connected ? "status-dot-disconnected" : ""}`} />
          {connected ? online_users : "Reconnecting…"}
        </div>

        {/* Secondary — frequent, icon-only with tooltips */}
        <div className="header-group">
          <button className="icon-btn" onClick={onOpenParticipants} title="People" aria-label="People">
            <IconPeople />
          </button>

          <button className="icon-btn" onClick={onOpenCameras} title="Cameras" aria-label="Cameras">
            <IconVideo />
          </button>

          <button className="icon-btn" onClick={copyInvite} title="Copy invite link" aria-label="Copy invite link">
            <IconLink />
          </button>

          <button
            className={`icon-btn ${isHandRaised ? 'hand-btn-active' : ''}`}
            onClick={toggleHand}
            disabled={handRaising}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            aria-label={isHandRaised ? 'Lower hand' : 'Raise hand'}
            aria-pressed={isHandRaised}
          >
            🙋
          </button>

          <button
            className={`icon-btn ${theater ? 'icon-btn-active' : ''}`}
            onClick={onToggleTheater}
            title={theater ? 'Exit theater mode' : 'Theater mode'}
            aria-label={theater ? 'Exit theater mode' : 'Theater mode'}
            aria-pressed={theater}
          >
            {theater ? <IconTheaterExit /> : <IconTheater />}
          </button>
        </div>

        {/* Tertiary — low-frequency actions behind progressive disclosure */}
        <div className="header-menu-anchor" ref={menuRef}>
          <button
            className={`icon-btn ${menuOpen ? 'icon-btn-active' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            title="More options"
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <IconMore />
          </button>

          {menuOpen && (
            <div className="header-menu" role="menu">
              {!amIController && isPlaying && (
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { requestPause(); setMenuOpen(false); }}
                  disabled={pauseRequestSent}
                  title="Ask the controller to pause so you can talk"
                >
                  ✋ {pauseRequestSent ? 'Pause requested…' : 'Request pause'}
                </button>
              )}

              {!amIHost && !amIController && room.settings?.allow_controller_requests !== false && (
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { requestControl(); setMenuOpen(false); }}
                  disabled={requestSent}
                  title="Request playback control from host"
                >
                  🎮 {requestSent ? 'Control requested…' : 'Request control'}
                </button>
              )}

              {amIHost && (
                <button
                  className="header-menu-item"
                  role="menuitem"
                  onClick={() => { setShowSettings(true); setMenuOpen(false); }}
                >
                  ⚙ Room settings
                </button>
              )}

              <button
                className="header-menu-item"
                role="menuitem"
                onClick={() => { onOpenPreferences(); setMenuOpen(false); }}
              >
                <IconUser /> Preferences
              </button>
            </div>
          )}
        </div>

        <div className="room-header-divider" />

        <button
          className="leave-btn"
          onClick={handleLeaveClick}
          title="Leave room"
        >
          <IconLogOut /> Leave
        </button>
      </div>

    </header>

      {/* Room Settings modal (host-only) */}
      {showSettings && (
        <RoomSettings room={room} onClose={() => setShowSettings(false)} />
      )}

      {/* Toast notification */}
      {toast && createPortal(
        <div className={`rh-toast rh-toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>,
        document.body
      )}

      {/* Controller request approval popup */}
      {controllerRequest && createPortal(
        <div className="ctrl-req-banner">
          <span className="ctrl-req-icon">🎮</span>
          <div className="ctrl-req-text">
            <strong>{controllerRequest.display_name}</strong>
            <span>wants to control playback</span>
          </div>
          <div className="ctrl-req-actions">
            <button className="ctrl-req-approve" onClick={approveControllerRequest}>
              Give Control
            </button>
            <button className="ctrl-req-dismiss" onClick={() => setControllerRequest(null)}>
              Dismiss
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Pause request popup (shown to the controller) */}
      {pauseRequest && createPortal(
        <div className="ctrl-req-banner">
          <span className="ctrl-req-icon">✋</span>
          <div className="ctrl-req-text">
            <strong>{pauseRequest.display_name}</strong>
            <span>wants to pause and talk</span>
          </div>
          <div className="ctrl-req-actions">
            <button className="ctrl-req-approve" onClick={pauseNow}>
              Pause Now
            </button>
            <button className="ctrl-req-dismiss" onClick={() => setPauseRequest(null)}>
              Dismiss
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Host leave dialog */}
      {showHostLeaveDialog && createPortal(
        <div className="host-leave-overlay">
          <div className="host-leave-dialog">
            <h3>You are the host</h3>
            <p>What would you like to do?</p>
            <div className="dialog-actions">
              <button className="dialog-end-btn" onClick={doEndRoom}>
                ⏹ End Room for Everyone
              </button>
              <button className="dialog-leave-btn" onClick={justLeave}>
                ⎋ Just Leave
              </button>
              <button
                className="dialog-cancel-btn"
                onClick={() => setShowHostLeaveDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

RoomHeader.propTypes = {
  room: PropTypes.shape({
    room_name: PropTypes.string,
    room_code: PropTypes.string,
    invite_token: PropTypes.string,
    host_participant_id: PropTypes.string,
    controller_participant_id: PropTypes.string,
    settings: PropTypes.object,
    content_source: PropTypes.shape({
      type: PropTypes.string,
    }),
    playback_state: PropTypes.shape({
      status: PropTypes.string,
      current_time: PropTypes.number,
    }),
    participants: PropTypes.arrayOf(
      PropTypes.shape({
        participant_id: PropTypes.string,
        hand_raised: PropTypes.bool,
        is_online: PropTypes.bool,
      })
    ),
  }).isRequired,

  refreshRoom:        PropTypes.func.isRequired,
  connected:          PropTypes.bool.isRequired,
  theater:            PropTypes.bool,
  onToggleTheater:    PropTypes.func.isRequired,
  streamedUpload: PropTypes.shape({
    uploading:  PropTypes.bool,
    progress:   PropTypes.number,
    error:      PropTypes.string,
    upload:     PropTypes.func,
    clearError: PropTypes.func,
  }).isRequired,
  onOpenPreferences:  PropTypes.func.isRequired,
  onOpenCameras:      PropTypes.func.isRequired,
  onOpenParticipants: PropTypes.func.isRequired,
};

export default RoomHeader;