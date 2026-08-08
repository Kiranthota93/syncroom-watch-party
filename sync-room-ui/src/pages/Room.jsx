import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import nodeAPI from "../services/api";
import socket from "../socket/socket";
import { SOCKET } from "../constants/events";
import { createLogger } from "../utils/logger";
import { usePreferences } from "../hooks/usePreferences";
import { useStableRoom } from "../hooks/useStableRoom";

const log = createLogger("Room");

import RoomHeader          from "../room/RoomHeader/RoomHeader";
import VideoStage           from "../room/VideoStage/VideoStage";
import RoomSidebar          from "../room/RoomSidebar/RoomSidebar";
import { useChat }          from "../chat/useChat";
import { useStreamedUpload } from "../content/hooks/useStreamedUpload";
import { useNotifications } from "../notifications/useNotifications";
import NotificationCenter   from "../components/NotificationCenter/NotificationCenter";
import ReactionOverlay, { ReactionPicker } from "../components/ReactionOverlay/ReactionOverlay";
import PreferencesModal     from "../components/PreferencesModal/PreferencesModal";
import RoomSkeleton         from "./RoomSkeleton";
import MediaPermissionBanner   from "../room/MediaPermissionBanner/MediaPermissionBanner";
import FloatingParticipantStrip from "../room/FloatingParticipantStrip/FloatingParticipantStrip";
import VoiceControlBar      from "../room/VoiceControlBar/VoiceControlBar";
import VideoCallDrawer      from "../room/VideoCallDrawer/VideoCallDrawer";
import { useCallService }   from "../call/hooks/useCallService";
import { useVoiceCall }     from "../call/hooks/useVoiceCall";
import { useVideoCall }     from "../call/hooks/useVideoCall";
import RemoteAudioPlayer    from "../call/RemoteAudioPlayer";

import "./Room.css";

function Room() {
  const { invite_token } = useParams();
  const navigate = useNavigate();

  // A transient "no content" update (fresh joiner racing a corrective
  // broadcast, or a reload racing the reconnect flow) gets held for 2s rather
  // than immediately flashing the empty state — see useStableRoom.
  const [room, setRoom]               = useStableRoom();
  const [loading, setLoading]         = useState(true);
  const [connected, setConnected]     = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [camerasOpen, setCamerasOpen] = useState(false);
  const [peopleTab, setPeopleTab] = useState(null); // null = drawer closed, else 'room' | 'chat' | 'info'
  const [theater, setTheater] = useState(false);

  const { prefs } = usePreferences();

  const currentUser = JSON.parse(localStorage.getItem("syncroom_user") || "{}");

  const myParticipant = room?.participants?.find(
    (p) => p.participant_id === currentUser.participant_id
  );
  const isPlaying = room?.playback_state?.status === "playing";
  const callDisabledReason = isPlaying ? "Talking is paused while content is playing" : undefined;

  const { service: callService, remoteStreams } = useCallService({
    inviteToken:   invite_token,
    participantId: currentUser.participant_id,
  });
  const voice = useVoiceCall({ service: callService, inviteToken: invite_token, myParticipant });
  const video = useVideoCall({ service: callService, inviteToken: invite_token, myParticipant });

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
  }, [invite_token, setRoom]);

  // Owned here (not in VideoStage) so "upload/replace streamed video" is
  // reachable from the header's content-source menu at any time, regardless
  // of which source is currently active.
  const streamedUpload = useStreamedUpload({
    inviteToken:   invite_token,
    participantId: currentUser.participant_id,
    refreshRoom:   fetchRoom,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("syncroom_user") || "{}");

    fetchRoom();

    const onConnect = () => {
      setConnected(true);
      if (user?.participant_id) {
        socket.emit(SOCKET.JOIN_ROOM, {
          invite_token,
          participant_id: user.participant_id,
        });
      }
    };

    const onDisconnect = () => setConnected(false);
    const onRoomUpdated = ({ room: nextRoom }) => setRoom(nextRoom);
    const onRoomEnded = () => {
      localStorage.removeItem("syncroom_user");
      navigate("/");
    };
    const onParticipantKicked = () => {
      localStorage.removeItem("syncroom_user");
      navigate("/?kicked=1");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SOCKET.ROOM_UPDATED, onRoomUpdated);
    socket.on(SOCKET.ROOM_ENDED, onRoomEnded);
    socket.on(SOCKET.PARTICIPANT_KICKED, onParticipantKicked);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET.ROOM_UPDATED, onRoomUpdated);
      socket.off(SOCKET.ROOM_ENDED, onRoomEnded);
      socket.off(SOCKET.PARTICIPANT_KICKED, onParticipantKicked);
      socket.disconnect();
    };
  }, [fetchRoom, invite_token, navigate, setRoom]);

  // Escape always leaves theater mode, so a collapsed header is never a trap.
  useEffect(() => {
    if (!theater) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !document.fullscreenElement) setTheater(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [theater]);

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

  const pageClass = [
    "room-page",
    isPlaying && "room-page-playing",
    theater && "room-page-theater",
  ].filter(Boolean).join(" ");

  return (
    <div className={pageClass}>

      <RoomHeader
        room={room}
        refreshRoom={fetchRoom}
        connected={connected}
        theater={theater}
        onToggleTheater={() => setTheater((v) => !v)}
        streamedUpload={streamedUpload}
        onOpenPreferences={() => setShowPreferences(true)}
        onOpenCameras={() => setCamerasOpen(true)}
        onOpenParticipants={() => setPeopleTab((t) => t ?? 'room')}
      />

      <MediaPermissionBanner
        needMic={voice.error?.code === 'mic_permission_denied'}
        needCam={video.error?.code === 'cam_permission_denied'}
        onGrantMic={voice.join}
        onGrantCam={video.join}
      />

      <div className="room-layout">
        <div className="room-main">
          <div className="room-stage-wrap">
            <VideoStage
              room={room}
              refreshRoom={fetchRoom}
              streamedUpload={streamedUpload}
            />
            <ReactionOverlay />
          </div>

          {/* Collaboration controls share one dock so they can't collide, and
              sit below the frame rather than over the player's control bar. */}
          <div className="room-dock">
            {room.settings?.allow_emoji_reactions !== false && (
              <ReactionPicker inviteToken={invite_token} />
            )}

            <VoiceControlBar
              joined={voice.joined}
              micOn={voice.micOn}
              mutedByHost={voice.mutedByHost}
              speakerMuted={voice.speakerMuted}
              pending={voice.pending}
              disabled={isPlaying}
              disabledReason={callDisabledReason}
              error={voice.error}
              onJoin={voice.join}
              onLeave={voice.leave}
              onToggleMic={voice.toggleMic}
              onToggleSpeaker={voice.toggleSpeaker}
            />

            <FloatingParticipantStrip
              room={room}
              speakingMap={voice.speakingMap}
              onOpen={() => setPeopleTab((t) => t ?? 'room')}
            />
          </div>
        </div>
      </div>

      <RoomSidebar
        open={peopleTab !== null}
        tab={peopleTab || 'room'}
        onTabChange={setPeopleTab}
        onClose={() => setPeopleTab(null)}
        room={room}
        refreshRoom={fetchRoom}
        chat={{ ...chat, participantId: currentUser.participant_id }}
      />

      <NotificationCenter toasts={toasts} onDismiss={dismiss} />

      <RemoteAudioPlayer remoteStreams={remoteStreams} muted={voice.speakerMuted} />

      <VideoCallDrawer
        open={camerasOpen}
        onOpenChange={setCamerasOpen}
        participants={room.participants || []}
        myParticipantId={currentUser.participant_id}
        remoteStreams={remoteStreams}
        localStream={callService.localStream}
        joined={video.joined}
        camOn={video.camOn}
        pinnedId={video.pinnedId}
        setPinnedId={video.setPinnedId}
        pending={video.pending}
        disabled={isPlaying}
        disabledReason={callDisabledReason}
        error={video.error}
        onJoin={video.join}
        onLeave={video.leave}
        onToggleCam={video.toggleCam}
        micOn={voice.micOn}
        mutedByHost={voice.mutedByHost}
        onToggleMic={voice.toggleMic}
      />

      {showPreferences && (
        <PreferencesModal onClose={() => setShowPreferences(false)} />
      )}
    </div>
  );
}

export default Room;