import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../../socket/socket';
import { SOCKET } from '../../constants/events';
import './ReactionOverlay.css';

const EMOJIS = ['❤️', '😂', '🔥', '👏', '👍', '😮'];
let nextReactionId = 0;

/** A single floating reaction bubble. */
function FloatingReaction({ id, emoji, x, duration, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), duration + 200);
    return () => clearTimeout(t);
  }, [id, duration, onDone]);

  return (
    <div
      className="reaction-float"
      style={{
        left:             `${x}%`,
        animationDuration: `${duration}ms`,
      }}
    >
      {emoji}
    </div>
  );
}

/** Overlay that renders floating reactions + the picker bar. */
export default function ReactionOverlay({ inviteToken }) {
  const [reactions, setReactions] = useState([]);
  const cooldownRef = useRef({});

  const addReaction = useCallback((emoji) => {
    const id = ++nextReactionId;
    // Random position 10-85% from left, random duration 2.2-3.5s
    const x        = 10 + Math.random() * 75;
    const duration = 2200 + Math.random() * 1300;
    setReactions((prev) => [...prev.slice(-20), { id, emoji, x, duration }]);
  }, []);

  const removeReaction = useCallback((id) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Listen for incoming reactions from all clients (including own)
  useEffect(() => {
    const onEmit = ({ emoji }) => addReaction(emoji);
    socket.on(SOCKET.REACTION_EMIT, onEmit);
    return () => socket.off(SOCKET.REACTION_EMIT, onEmit);
  }, [addReaction]);

  const sendReaction = (emoji) => {
    // Per-emoji cooldown 800ms to avoid spam
    const now = Date.now();
    if (cooldownRef.current[emoji] && now - cooldownRef.current[emoji] < 800) return;
    cooldownRef.current[emoji] = now;
    socket.emit(SOCKET.REACTION_SEND, { invite_token: inviteToken, emoji });
  };

  return (
    <>
      {/* Floating emojis layer — covers the video stage area */}
      <div className="reaction-overlay" aria-hidden="true">
        {reactions.map((r) => (
          <FloatingReaction
            key={r.id}
            id={r.id}
            emoji={r.emoji}
            x={r.x}
            duration={r.duration}
            onDone={removeReaction}
          />
        ))}
      </div>

      {/* Picker bar */}
      <div className="reaction-bar" role="toolbar" aria-label="Emoji reactions">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="reaction-btn"
            onClick={() => sendReaction(emoji)}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
