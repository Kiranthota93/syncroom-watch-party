import FeatureCard from "./FeatureCard.jsx";
import "./Features.css";

const features = [
  {
    icon: "⚡",
    title: "Frame-perfect sync",
    description: "Play, pause, seek, and speed changes propagate to every viewer instantly. Drift correction keeps everyone aligned automatically.",
  },
  {
    icon: "🎬",
    title: "YouTube + Local Video",
    description: "Paste any YouTube link or load a video file from your device. Everyone watches the same content, perfectly in sync.",
  },
  {
    icon: "🎮",
    title: "Controller system",
    description: "One person controls playback. The host can assign the controller to anyone in the room at any time.",
  },
  {
    icon: "🔗",
    title: "Just share a code",
    description: "No accounts, no installs. Generate a room, share the 8-character code, and your friends are in within seconds.",
  },
  {
    icon: "✅",
    title: "Ready state",
    description: "For local video, everyone confirms their file before playback starts. No one gets left behind loading.",
  },
  {
    icon: "📱",
    title: "Works everywhere",
    description: "Chrome, Firefox, Edge, desktop or mobile — the room adapts. Bring your couch, kitchen, or commute.",
  },
];

function Features() {
  return (
    <section className="features-section">
      {features.map((f) => (
        <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
      ))}
    </section>
  );
}

export default Features;
