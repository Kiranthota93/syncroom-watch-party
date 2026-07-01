import { useState, useEffect } from "react";
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

const IconPower = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
    <line x1="12" y1="2" x2="12" y2="12"/>
  </svg>
);

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

function RoomHeader({ room, refreshRoom, connected, onOpenPreferences }) {
  const navigate = useNavigate();

  const [showHostLeaveDialog,  setShowHostLeaveDialog]  = useState(false);
  const [showEndRoomDialog,    setShowEndRoomDialog]    = useState(false);
  const [showSettings,         setShowSettings]         = useState(false);
  const [toast,                setToast]                = useState(null);
  const [handRaising,          setHandRaising]          = useState(false);
  const [controllerRequest,    setControllerRequest]    = useState(null); // { participant_id, display_name, invite_token }
  const [requestSent,          setRequestSent]          = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

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

  // Opens the styled confirmation dialog
  const confirmEndRoom = () => setShowEndRoomDialog(true);

  // Actually ends the room — called after confirmation
  const doEndRoom = async () => {
    setShowEndRoomDialog(false);
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
      </div>

      <div className="room-header-right">
        <div className={`connection-status ${!connected ? "connection-status-disconnected" : ""}`}>
          <span className={`status-dot ${!connected ? "status-dot-disconnected" : ""}`} />

          {connected ? "Connected" : "Reconnecting..."} •{" "}
          {online_users} Online
        </div>

        <button
          className="header-btn"
          onClick={copyInvite}
        >
          <IconLink /> Copy Invite
        </button>

        {amIHost && (
          <>
            <button
              className="header-btn settings-btn"
              onClick={() => setShowSettings(true)}
              title="Room Settings"
            >
              ⚙
            </button>
            <button
              className="end-room-btn"
              onClick={confirmEndRoom}
            >
              <IconPower /> End Room
            </button>
          </>
        )}

        {!amIHost && !amIController && (
          <button
            className={`header-btn ${requestSent ? 'req-sent' : ''}`}
            onClick={requestControl}
            disabled={requestSent}
            title="Request playback control from host"
          >
            🎮 {requestSent ? 'Requested…' : 'Request Control'}
          </button>
        )}

        <button
          className={`hand-btn ${isHandRaised ? 'hand-btn-active' : ''}`}
          onClick={toggleHand}
          disabled={handRaising}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          🙋 {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        </button>

        <button
          className="header-btn prefs-btn"
          onClick={onOpenPreferences}
          title="Preferences"
        >
          <IconUser />
        </button>

        <button
          className="leave-btn"
          onClick={handleLeaveClick}
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

      {/* End Room confirmation dialog */}
      {showEndRoomDialog && createPortal(
        <div className="host-leave-overlay">
          <div className="host-leave-dialog">
            <div className="end-room-warning-icon">⏹</div>
            <h3>End room for everyone?</h3>
            <p>
              This will immediately disconnect all participants and
              permanently close the room. This cannot be undone.
            </p>
            <div className="dialog-actions">
              <button className="dialog-end-btn" onClick={doEndRoom}>
                Yes, end the room
              </button>
              <button
                className="dialog-cancel-btn"
                onClick={() => setShowEndRoomDialog(false)}
              >
                Cancel
              </button>
            </div>
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
    participants: PropTypes.arrayOf(
      PropTypes.shape({
        is_online: PropTypes.bool,
      })
    ),
  }).isRequired,

  refreshRoom:        PropTypes.func.isRequired,
  connected:          PropTypes.bool.isRequired,
  onOpenPreferences:  PropTypes.func.isRequired,
};

export default RoomHeader;