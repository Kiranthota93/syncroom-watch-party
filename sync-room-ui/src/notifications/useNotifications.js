import { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket/socket';
import { SOCKET } from '../constants/events';

let nextId = 0;

const TYPES = {
  success: 'success',
  info:    'info',
  warning: 'warning',
  error:   'error',
};

/**
 * useNotifications — derives toast notifications from existing socket events.
 *
 * Listens to:
 *   room:updated  — diffs room state to detect join/leave/controller/content changes
 *   playback:play / pause — playback status
 *   chat:message  — shows preview when chat tab is not active
 *   room:ended    — room closed
 *
 * Never requires new backend events.
 */
export function useNotifications({ room, chatTabActive = false, notificationsEnabled = true }) {
  const [toasts, setToasts] = useState([]);
  const prevRoomRef         = useRef(null);

  const push = useCallback((msg, type = TYPES.info, icon = '🔔') => {
    if (!notificationsEnabled) return;
    const id = ++nextId;
    setToasts((prev) => [...prev.slice(-3), { id, msg, type, icon }]); // max 4 visible
    return id;
  }, [notificationsEnabled]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Room state diff ────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const prev = prevRoomRef.current;
    prevRoomRef.current = room;
    if (!prev) return; // first load — skip

    const prevIds  = new Set((prev.participants || []).map((p) => p.participant_id));
    const nextParts = room.participants || [];

    // Joined
    nextParts.forEach((p) => {
      if (!prevIds.has(p.participant_id) && p.is_online) {
        push(`${p.display_name} joined`, TYPES.success, '🟢');
      }
    });

    // Left (was online, now offline)
    (prev.participants || []).forEach((p) => {
      if (p.is_online) {
        const curr = nextParts.find((np) => np.participant_id === p.participant_id);
        if (curr && !curr.is_online) {
          push(`${p.display_name} left`, TYPES.info, '🔴');
        }
      }
    });

    // Controller changed
    if (
      prev.controller_participant_id &&
      prev.controller_participant_id !== room.controller_participant_id
    ) {
      const newCtrl = nextParts.find((p) => p.participant_id === room.controller_participant_id);
      if (newCtrl) {
        push(`${newCtrl.display_name} is now controlling`, TYPES.info, '🎮');
      }
    }

    // Host changed
    if (prev.host_participant_id && prev.host_participant_id !== room.host_participant_id) {
      const newHost = nextParts.find((p) => p.participant_id === room.host_participant_id);
      if (newHost) {
        push(`${newHost.display_name} is now the host`, TYPES.info, '👑');
      }
    }

    // Content type changed
    const prevType = prev.content_source?.type;
    const nextType = room.content_source?.type;
    if (prevType !== nextType && nextType) {
      const label = nextType === 'youtube' ? 'YouTube' : 'Local Video';
      push(`Content switched to ${label}`, TYPES.info, '🎬');
    }

    // Hand raised
    nextParts.forEach((p) => {
      const prevP = (prev.participants || []).find((pp) => pp.participant_id === p.participant_id);
      if (p.hand_raised && prevP && !prevP.hand_raised) {
        push(`${p.display_name} raised their hand 🙋`, TYPES.warning, '🙋');
      }
    });

    // Everyone ready (when all online participants have is_ready = true)
    const online  = nextParts.filter((p) => p.is_online);
    const wasAll  = (prev.participants || []).filter((p) => p.is_online).every((p) => p.is_ready);
    const nowAll  = online.length > 0 && online.every((p) => p.is_ready);
    if (nowAll && !wasAll) {
      push('Everyone is ready', TYPES.success, '✅');
    }
  }, [room, push]);

  // ── Playback events ────────────────────────────────────────────
  useEffect(() => {
    const onPlay  = () => push('Playback started', TYPES.info, '▶');
    const onPause = () => push('Playback paused',  TYPES.info, '⏸');
    const onEnded = () => push('Room ended',        TYPES.error, '🚪');

    socket.on(SOCKET.PLAYBACK_PLAY,  onPlay);
    socket.on(SOCKET.PLAYBACK_PAUSE, onPause);
    socket.on(SOCKET.ROOM_ENDED,     onEnded);

    return () => {
      socket.off(SOCKET.PLAYBACK_PLAY,  onPlay);
      socket.off(SOCKET.PLAYBACK_PAUSE, onPause);
      socket.off(SOCKET.ROOM_ENDED,     onEnded);
    };
  }, [push]);

  // ── Chat messages (when Room tab is active) ─────────────────────
  useEffect(() => {
    const onMsg = ({ display_name, message, type }) => {
      if (chatTabActive || type === 'system') return;
      const preview = message.length > 40 ? message.slice(0, 40) + '…' : message;
      push(`${display_name}: ${preview}`, TYPES.info, '💬');
    };
    socket.on(SOCKET.CHAT_MESSAGE, onMsg);
    return () => socket.off(SOCKET.CHAT_MESSAGE, onMsg);
  }, [push, chatTabActive]);

  return { toasts, dismiss };
}
