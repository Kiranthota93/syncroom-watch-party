import { useCallback, useRef, useState } from "react";

const LOSS_GRACE_MS = 2000;

/**
 * Wraps room state with a grace period against transient "content just
 * disappeared" updates — e.g. a fresh joiner's first fetch landing a beat
 * before a corrective ROOM_UPDATED, or a reload racing the reconnect flow.
 * A raw setRoom would flash the empty/no-content state in either case.
 *
 * Only content_source/playback_state are held back; everything else in the
 * incoming room (participants, settings, etc.) still applies immediately, so
 * this never makes the rest of the room feel stale.
 */
export function useStableRoom() {
  const [room, setRoomState] = useState(null);
  const lastGoodContentRef = useRef(null); // { content_source, playback_state }
  const revertTimerRef = useRef(null);

  const clearPendingRevert = () => {
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
  };

  const commitRoom = useCallback((nextRoom) => {
    if (!nextRoom) {
      setRoomState(nextRoom);
      return;
    }

    const hasContent = Boolean(nextRoom.content_source?.type);

    if (hasContent) {
      clearPendingRevert();
      lastGoodContentRef.current = {
        content_source:  nextRoom.content_source,
        playback_state:  nextRoom.playback_state,
      };
      setRoomState(nextRoom);
      return;
    }

    const lastGood = lastGoodContentRef.current;
    if (!lastGood) {
      // Room genuinely never had content — nothing to protect, apply as-is.
      setRoomState(nextRoom);
      return;
    }

    // Content just vanished from an update while we have a known-good copy —
    // keep showing that copy, update everything else about the room normally,
    // and only let the loss stand if it's still true 2s from now.
    setRoomState({ ...nextRoom, ...lastGood });

    clearPendingRevert();
    revertTimerRef.current = setTimeout(() => {
      revertTimerRef.current = null;
      lastGoodContentRef.current = null;
      setRoomState((current) => current && { ...current, ...nextRoom });
    }, LOSS_GRACE_MS);
  }, []);

  return [room, commitRoom];
}
