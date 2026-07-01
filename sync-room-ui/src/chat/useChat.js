import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket/socket';
import { SOCKET } from '../constants/events';

export function useChat({ inviteToken, participantId, displayName }) {
  const [messages,     setMessages]     = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [typingUsers,  setTypingUsers]  = useState([]); // [{ participant_id, display_name }]
  const isVisible      = useRef(false);
  const typingTimers   = useRef({});    // participant_id → setTimeout id

  useEffect(() => {
    if (!inviteToken) return;

    const onHistory = ({ messages: history }) => setMessages(history || []);

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isVisible.current) setUnreadCount((n) => n + 1);
    };

    const onTyping = ({ participant_id, display_name, typing }) => {
      if (participant_id === participantId) return; // ignore own echo

      // Clear existing expiry timer for this user
      if (typingTimers.current[participant_id]) {
        clearTimeout(typingTimers.current[participant_id]);
        delete typingTimers.current[participant_id];
      }

      if (typing) {
        setTypingUsers((prev) =>
          prev.find((u) => u.participant_id === participant_id)
            ? prev
            : [...prev, { participant_id, display_name }]
        );
        // Auto-expire after 3s (covers dropped "stop typing" events)
        typingTimers.current[participant_id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.participant_id !== participant_id));
          delete typingTimers.current[participant_id];
        }, 3000);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.participant_id !== participant_id));
      }
    };

    socket.on(SOCKET.CHAT_HISTORY, onHistory);
    socket.on(SOCKET.CHAT_MESSAGE, onMessage);
    socket.on(SOCKET.CHAT_TYPING,  onTyping);

    return () => {
      socket.off(SOCKET.CHAT_HISTORY, onHistory);
      socket.off(SOCKET.CHAT_MESSAGE, onMessage);
      socket.off(SOCKET.CHAT_TYPING,  onTyping);
      // Clear all pending timers
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
    };
  }, [inviteToken, participantId]);

  const sendMessage = useCallback((text) => {
    const trimmed = text?.trim();
    if (!trimmed || !inviteToken || !participantId) return;
    socket.emit(SOCKET.CHAT_MESSAGE, {
      invite_token:   inviteToken,
      participant_id: participantId,
      message:        trimmed,
    });
  }, [inviteToken, participantId]);

  const sendTyping = useCallback((isTyping) => {
    if (!inviteToken || !participantId) return;
    socket.emit(SOCKET.CHAT_TYPING, {
      invite_token:   inviteToken,
      participant_id: participantId,
      display_name:   displayName,
      typing:         isTyping,
    });
  }, [inviteToken, participantId, displayName]);

  const markRead = useCallback(() => {
    setUnreadCount(0);
    isVisible.current = true;
  }, []);

  const markHidden = useCallback(() => {
    isVisible.current = false;
  }, []);

  return {
    messages, unreadCount, typingUsers,
    sendMessage, sendTyping,
    markRead, markHidden,
    chatTabActive: isVisible.current,
  };
}
