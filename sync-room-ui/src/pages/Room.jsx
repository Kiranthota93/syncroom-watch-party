import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import nodeAPI from "../services/api";
import socket from "../socket/socket";
import { SOCKET } from "../constants/events";
import { createLogger } from "../utils/logger";
import { usePreferences } from "../hooks/usePreferences";

const log = createLogger("Room");

import RoomHeader          from "../room/RoomHeader/RoomHeader";
import VideoStage           from "../room/VideoStage/VideoStage";
import SourceSelector       from "../room/SourceSelector/SourceSelector";
import RoomSidebar          from "../room/RoomSidebar/RoomSidebar";
import { useChat }          from "../chat/useChat";
import { useNotifications } from "../notifications/useNotifications";
import NotificationCenter   from "../components/NotificationCenter/NotificationCenter";
import ReactionOverlay      from "../components/ReactionOverlay/ReactionOverlay";
import PreferencesModal     from "../components/PreferencesModal/PreferencesModal";
import RoomSkeleton         from "./RoomSkeleton";

import "./Room.css";

function Room() {
  const { invite_token } = useParams();
  const navigate = useNavigate();

  const [room, setRoom]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [connected, setConnected]     = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { prefs } = usePreferences();

  const currentUser = JSON.parse(localStorage.getItem("syncroom_user") || "{}");

  const chat = useChat({
    inviteToken:   invite_token,
    participantId: currentUser.participant_id,
    displayName:   currentUser.display_name,
  });

  const { toasts, dismiss } = useNotifications({
    room,
    chatTabActive:        chat.chatTabActive,
    notificationsEnabled: prefs.notifications,
  });

  const fetchRoom = useCallback(async () => {
    try {
      const { data } = await nodeAPI.get(`/rooms/${invite_token}`);
      setRoom(data.room);
    } catch (error) {
      log.error("Failed to fetch room", error);
    } finally {
      setLoading(false);
    }
  }, [invite_token]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("syncroom_user") || "{}");

    fetchRoom();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(SOCKET.JOIN_ROOM, {
        invite_token,
        participant_id: user.participant_id,
      });
    });
    socket.on("disconnect", () => setConnected(false));

    socket.connect();

    socket.on(SOCKET.ROOM_UPDATED, ({ room }) => {
      setRoom(room);
    });

    socket.on(SOCKET.ROOM_ENDED, () => {
      localStorage.removeItem("syncroom_user");
      navigate("/");
    });

    socket.on(SOCKET.PARTICIPANT_KICKED, () => {
      localStorage.removeItem("syncroom_user");
      navigate("/?kicked=1");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off(SOCKET.ROOM_UPDATED);
      socket.off(SOCKET.ROOM_ENDED);
      socket.off(SOCKET.PARTICIPANT_KICKED);
      socket.disconnect();
    };
  }, [fetchRoom, invite_token, navigate]);

  if (loading) return <RoomSkeleton />;

  if (!room) {
    return (
      <div className="room-error">
        <h2>Room not found</h2>
        <p>This room may have ended or the link is invalid.</p>
        <a href="/" className="room-error-back">← Back to home</a>
      </div>
    );
  }

  return (
    <div className="room-page">
      <RoomHeader
        room={room}
        refreshRoom={fetchRoom}
        connected={connected}
        onOpenPreferences={() => setShowPreferences(true)}
      />

      <div className="room-layout">
        <div className="room-main">
          <div className="room-stage-wrap">
            <VideoStage
              room={room}
              refreshRoom={fetchRoom}
            />
            <ReactionOverlay inviteToken={invite_token} />
          </div>

          <SourceSelector
            room={room}
            refreshRoom={fetchRoom}
          />
        </div>

        <RoomSidebar
          room={room}
          refreshRoom={fetchRoom}
          chat={{ ...chat, participantId: currentUser.participant_id }}
        />
      </div>

      <NotificationCenter toasts={toasts} onDismiss={dismiss} />

      {showPreferences && (
        <PreferencesModal onClose={() => setShowPreferences(false)} />
      )}
    </div>
  );
}

export default Room;