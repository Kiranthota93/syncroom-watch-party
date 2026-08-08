const palette = [
  "oklch(0.68 0.22 295)",
  "oklch(0.72 0.18 155)",
  "oklch(0.7 0.2 30)",
  "oklch(0.7 0.18 220)",
  "oklch(0.75 0.18 90)",
  "oklch(0.68 0.22 340)",
  "oklch(0.72 0.16 190)",
  "oklch(0.7 0.2 60)",
];

const names = ["KIRAN", "Anaya", "Rohan", "Priya", "Marcus", "Léa", "Yuki", "Diego"];

export const mockParticipants = names.map((name, i) => ({
  id: `u-${i}`,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  color: palette[i % palette.length],
  role: i === 0 ? "host" : i === 1 ? "controller" : "participant",
  online: i < 6,
  micOn: i % 3 !== 0,
  camOn: i % 4 === 1,
  speaking: false,
  handRaised: i === 4,
  joinedAgo: i === 0 ? "just now" : `${i * 2 + 1}m ago`,
}));

export const mockChat = [
  { id: "m1", userId: "u-1", text: "hiii finally 😍", ts: "22:45" },
  { id: "m2", userId: "u-0", text: "starting in 2 min, grab snacks", ts: "22:46" },
  { id: "m3", userId: "u-3", text: "🔥🔥🔥", ts: "22:46" },
  { id: "m4", userId: "u-2", text: "audio synced?", ts: "22:47" },
];

export const reactionSet = ["❤️", "😂", "🔥", "👏", "👍", "😮"];
