import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import './ChatPanel.css';

const fmt = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const initials = (name) =>
  (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_COLORS = ['#8b5cf6','#3b82f6','#22c55e','#f97316','#ec4899','#14b8a6'];
const avatarColor = (name) =>
  AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];

// ── Emoji data ────────────────────────────────────────────────────────────────
const EMOJIS = [
  // Faces
  '😀','😂','🤣','😅','😊','😍','🥰','😎','🥺','😭','😤','😏',
  '🤔','🤩','😬','😴','🥳','😈','🤯','🤗','🫡','😱',
  // Hands & people
  '👍','👎','👏','🙏','💪','🤝','🫶','👀','🤞','✌️',
  // Hearts & symbols
  '❤️','💕','💯','✨','🔥','⚡','💥','💡','💫','⭐','🌈',
  // Objects & activities
  '🎉','🎮','🎬','🎵','🎸','🎯','🎲','🏆','🍕','🍿',
  '🌙','🌊','🦄','👻','💀','🤡','👾','🎭',
  // Misc
  '🚀','🌍','🎊','🔊','🗣️','💤','💢',
];

function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div className="emoji-picker" ref={ref}>
      {EMOJIS.map((e) => (
        <button
          key={e}
          className="emoji-btn"
          onClick={() => onSelect(e)}
          aria-label={e}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

EmojiPicker.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onClose:  PropTypes.func.isRequired,
};

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  let text;
  if (users.length === 1)      text = `${users[0].display_name} is typing`;
  else if (users.length === 2) text = `${users[0].display_name} and ${users[1].display_name} are typing`;
  else                         text = `${users.length} people are typing`;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span /><span /><span />
      </span>
      <span className="typing-text">{text}</span>
    </div>
  );
}

TypingIndicator.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    participant_id: PropTypes.string,
    display_name:   PropTypes.string,
  })),
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPanel({
  messages, onSend, onTyping, typingUsers,
  currentParticipantId, onVisible, onHidden, disabled,
}) {
  const [input,      setInput]      = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    onVisible?.();
    inputRef.current?.focus();
    return () => onHidden?.();
  }, [onVisible, onHidden]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fire typing events with auto-stop after 2s idle
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTyping(false), 2000);
    }
  };

  const submit = useCallback(() => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    setShowEmojis(false);
    if (onTyping) {
      clearTimeout(typingTimer.current);
      onTyping(false);
    }
  }, [input, onSend, onTyping]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') setShowEmojis(false);
  };

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) { setInput((v) => v + emoji); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + emoji.length;
      el.focus();
    }, 0);
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTyping(false), 2000);
    }
  };

  return (
    <div className="chat-panel">
      {/* Message list */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <span>No messages yet</span>
            <p>Be the first to say something 👋</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={msg._id || i} className="chat-system">
                {msg.message}
              </div>
            );
          }

          const isMe    = msg.participant_id === currentParticipantId;
          const prevMsg = messages[i - 1];
          const grouped = prevMsg && prevMsg.participant_id === msg.participant_id && prevMsg.type === 'text';

          return (
            <div
              key={msg._id || i}
              className={`chat-msg ${isMe ? 'chat-msg-me' : ''} ${grouped ? 'chat-msg-grouped' : ''}`}
            >
              {!isMe && !grouped && (
                <div className="chat-avatar" style={{ background: avatarColor(msg.display_name) }}>
                  {initials(msg.display_name)}
                </div>
              )}
              {!isMe && grouped && <div className="chat-avatar-spacer" />}

              <div className="chat-bubble-wrap">
                {!isMe && !grouped && (
                  <div className="chat-sender">{msg.display_name}</div>
                )}
                <div className="chat-bubble">
                  {msg.message}
                  <span className="chat-time">{fmt(msg.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <TypingIndicator users={typingUsers} />
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      {disabled ? (
        <div className="chat-disabled-notice">Chat has been disabled by the host</div>
      ) : (
        <div className="chat-input-row">
          {/* Emoji picker anchored inside the row's position:relative */}
          {showEmojis && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojis(false)} />
          )}

          <button
            className={`emoji-toggle ${showEmojis ? 'emoji-toggle-active' : ''}`}
            onClick={() => setShowEmojis((v) => !v)}
            aria-label="Emoji picker"
            title="Emoji picker"
          >
            😊
          </button>

          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Message… (Enter to send)"
            value={input}
            rows={1}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            maxLength={500}
          />

          <button
            className="chat-send-btn"
            onClick={submit}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

ChatPanel.propTypes = {
  messages:             PropTypes.array.isRequired,
  onSend:               PropTypes.func.isRequired,
  onTyping:             PropTypes.func,
  typingUsers:          PropTypes.array,
  currentParticipantId: PropTypes.string,
  onVisible:            PropTypes.func,
  onHidden:             PropTypes.func,
  disabled:             PropTypes.bool,
};
