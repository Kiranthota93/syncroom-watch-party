import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
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

/**
 * Floating-emoji layer. Anchored to the video stage, so it stays separate from
 * the picker — the two share no state and belong in different places in the
 * layout (emojis over the video, picker in the bottom dock).
 */
export default function ReactionOverlay() {
  const [reactions, setReactions] = useState([]);

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

  return (
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
  );
}

/**
 * Emoji picker, collapsed behind a single trigger. Previously a persistent
 * six-button row that held a full-width strip of above-the-fold space for an
 * episodic action.
 */
export function ReactionPicker({ inviteToken }) {
  const [open, setOpen] = useState(false);
  const cooldownRef = useRef({});
  const rootRef = useRef(null);

  const sendReaction = (emoji) => {
    // Per-emoji cooldown 800ms to avoid spam
    const now = Date.now();
    if (cooldownRef.current[emoji] && now - cooldownRef.current[emoji] < 800) return;
    cooldownRef.current[emoji] = now;
    socket.emit(SOCKET.REACTION_SEND, { invite_token: inviteToken, emoji });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="reaction-dock" ref={rootRef}>
      {open && (
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
      )}

      <button
        className={`reaction-trigger ${open ? 'reaction-trigger-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Send a reaction"
        aria-expanded={open}
        title="Send a reaction"
      >
        <span aria-hidden="true">🙂</span>
      </button>
    </div>
  );
}

ReactionPicker.propTypes = {
  inviteToken: PropTypes.string.isRequired,
};

FloatingReaction.propTypes = {
  id: PropTypes.number.isRequired,
  emoji: PropTypes.string.isRequired,
  x: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  onDone: PropTypes.func.isRequired,
};
