import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  useRoom,
  usePlayback,
  useParticipants,
  useVoice,
  useVideo,
  usePermissions,
  usePresence,
  useReactions,
} from "@/hooks/room";
import { RoomHeader } from "@/components/room/RoomHeader";
import { VideoStage } from "@/components/room/VideoStage";
import { SourceSelector } from "@/components/room/SourceSelector";
import { FloatingParticipantStrip } from "@/components/room/FloatingParticipantStrip";
import { VoiceControlBar } from "@/components/room/VoiceControlBar";
import { ParticipantsDrawer } from "@/components/room/ParticipantsDrawer";
import { VideoCallDrawer } from "@/components/room/VideoCallDrawer";
import { PreferencesModal } from "@/components/room/PreferencesModal";
import { MediaPermissionBanner } from "@/components/room/MediaPermissionBanner";

export const Route = createFileRoute("/room/$roomCode")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.roomCode} · SyncRoom` },
      {
        name: "description",
        content:
          "You're in a SyncRoom watch-party. Sync video, chat, react and talk with friends in real time.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});

const CURRENT_USER_ID = "u-0";

function RoomPage() {
  const { roomCode } = Route.useParams();
  const room = useRoom(roomCode);
  const playback = usePlayback();
  const participants = useParticipants();
  const voice = useVoice({ playbackActive: playback.isPlaying });
  const video = useVideo();
  const perms = usePermissions();
  const presence = usePresence(participants.list);
  const reactions = useReactions();

  const [drawer, setDrawer] = useState(null);
  const [camerasOpen, setCamerasOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!voice.effectivelyActive) {
      participants.setSpeaking(null);
      return;
    }
    const pool = participants.list.filter((p) => p.online && p.micOn);
    if (pool.length === 0) return;
    const cycle = setInterval(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      participants.setSpeaking(pick.id);
    }, 2200);
    return () => clearInterval(cycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.effectivelyActive]);

  const stripExtra = Math.max(
    0,
    presence.online -
      [participants.host?.id, participants.controller?.id, participants.speaker?.id]
        .filter((v, i, a) => v && a.indexOf(v) === i).length,
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <RoomHeader
        roomName={room.name}
        roomCode={room.code}
        connected={room.connected}
        onlineCount={presence.online}
        onOpenParticipants={() => setDrawer("room")}
        onOpenCameras={() => setCamerasOpen(true)}
        onOpenPrefs={() => setPrefsOpen(true)}
        onRaiseHand={() => toast("✋ Hand raised")}
      />

      <MediaPermissionBanner
        needMic={voice.joined && perms.mic !== "granted"}
        needCam={perms.cam !== "granted" && video.pinnedId !== null}
        onGrantMic={perms.grantMic}
        onGrantCam={perms.grantCam}
      />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <VideoStage
          source={playback.source}
          isPlaying={playback.isPlaying}
          onTogglePlay={() => playback.setIsPlaying(!playback.isPlaying)}
          currentTime={playback.currentTime}
          duration={playback.duration}
          onSeek={playback.setCurrentTime}
          reactions={reactions.items}
          onReact={reactions.send}
          onLoad={() => {
            playback.setIsPlaying(true);
            toast.success("Everyone is ready", {
              description: "Playback started for the room",
            });
          }}
        />
        <SourceSelector
          current={playback.source}
          onSelect={(s) => {
            playback.setSource(s);
            playback.setIsPlaying(false);
            playback.setCurrentTime(0);
            toast(`Content switched to ${s === "local" ? "Local Video" : s === "youtube" ? "YouTube" : s}`);
          }}
        />
      </main>

      <FloatingParticipantStrip
        host={participants.host}
        controller={participants.controller}
        speaker={participants.speaker}
        extra={stripExtra}
        onOpen={() => setDrawer("room")}
      />

      <VoiceControlBar
        joined={voice.joined}
        muted={voice.muted}
        speakerMuted={voice.speakerMuted}
        disabled={playback.isPlaying}
        onJoin={() => {
          voice.join();
          perms.grantMic();
          toast.success("Joined voice");
        }}
        onLeave={() => {
          voice.leave();
          toast("Left voice");
        }}
        onToggleMute={voice.toggleMute}
        onToggleSpeaker={voice.toggleSpeaker}
      />

      <ParticipantsDrawer
        open={drawer !== null}
        onOpenChange={(o) => setDrawer(o ? drawer ?? "room" : null)}
        tab={drawer ?? "room"}
        onTabChange={(t) => setDrawer(t)}
        participants={participants.list}
        max={participants.max}
        currentUserId={CURRENT_USER_ID}
        roomCode={room.code}
        onKick={participants.kick}
        onTransferHost={participants.transferHost}
        onTransferController={participants.transferController}
        onToggleMute={participants.toggleMute}
      />

      <VideoCallDrawer
        open={camerasOpen}
        onOpenChange={setCamerasOpen}
        participants={participants.list}
        pinnedId={video.pinnedId}
        onPin={video.setPinnedId}
        onToggleMute={participants.toggleMute}
        onToggleCam={participants.toggleCam}
      />

      <PreferencesModal open={prefsOpen} onOpenChange={setPrefsOpen} />

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "glass border border-glass-border rounded-2xl",
          },
        }}
      />
    </div>
  );
}
