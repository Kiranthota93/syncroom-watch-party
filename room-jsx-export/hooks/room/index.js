import { useCallback, useEffect, useMemo, useState } from "react";
import { mockParticipants, mockChat } from "@/lib/room/mock-data";

export function useRoom(roomCode) {
  return {
    code: roomCode,
    name: "Movie Night",
    connected: true,
    expiresIn: "23h 58m",
    createdAgo: "just now",
  };
}

export function usePlayback() {
  const [source, setSource] = useState("none");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 185;

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setCurrentTime((c) => (c + 1 > duration ? 0 : c + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying]);

  return {
    source,
    setSource,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    hasMedia: source !== "none",
  };
}

export function useParticipants() {
  const [list, setList] = useState(mockParticipants);
  const host = list.find((p) => p.role === "host") ?? list[0];
  const controller = list.find((p) => p.role === "controller") ?? host;
  const speaker = list.find((p) => p.speaking) ?? null;
  const online = list.filter((p) => p.online);

  const toggleMute = (id) =>
    setList((l) => l.map((p) => (p.id === id ? { ...p, micOn: !p.micOn } : p)));
  const toggleCam = (id) =>
    setList((l) => l.map((p) => (p.id === id ? { ...p, camOn: !p.camOn } : p)));
  const kick = (id) => setList((l) => l.filter((p) => p.id !== id));
  const transferHost = (id) =>
    setList((l) =>
      l.map((p) => ({
        ...p,
        role: p.id === id ? "host" : p.role === "host" ? "participant" : p.role,
      })),
    );
  const transferController = (id) =>
    setList((l) =>
      l.map((p) => ({
        ...p,
        role:
          p.id === id
            ? "controller"
            : p.role === "controller"
              ? "participant"
              : p.role,
      })),
    );
  const setSpeaking = (id) =>
    setList((l) => l.map((p) => ({ ...p, speaking: p.id === id })));

  return {
    list,
    online,
    host,
    controller,
    speaker,
    max: 15,
    toggleMute,
    toggleCam,
    kick,
    transferHost,
    transferController,
    setSpeaking,
  };
}

export function useVoice(opts) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const effectivelyActive = joined && !opts.playbackActive;

  return {
    joined,
    muted,
    speakerMuted,
    effectivelyActive,
    join: () => setJoined(true),
    leave: () => setJoined(false),
    toggleMute: () => setMuted((m) => !m),
    toggleSpeaker: () => setSpeakerMuted((m) => !m),
  };
}

export function useVideo() {
  const [pinnedId, setPinnedId] = useState(null);
  return { pinnedId, setPinnedId };
}

export function usePermissions() {
  const [mic, setMic] = useState("prompt");
  const [cam, setCam] = useState("prompt");
  return { mic, cam, grantMic: () => setMic("granted"), grantCam: () => setCam("granted") };
}

export function usePresence(list) {
  return useMemo(
    () => ({ online: list.filter((p) => p.online).length, total: list.length }),
    [list],
  );
}

export function useReactions() {
  const [items, setItems] = useState([]);
  const send = useCallback((emoji) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 20 + Math.random() * 60;
    setItems((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setItems((prev) => prev.filter((r) => r.id !== id)), 2400);
  }, []);
  return { items, send };
}

export function useChat() {
  const [messages, setMessages] = useState(mockChat);
  const send = (userId, text) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      {
        id: `m-${Date.now()}`,
        userId,
        text,
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };
  return { messages, send };
}
