import { useCallback, useEffect, useState } from 'react';
import socket from '../../socket/socket';
import { SOCKET } from '../../constants/events';
import { isSecureContext, INSECURE_CONTEXT_ERROR } from '../secureContext';

export function useVideoCall({ service, inviteToken, myParticipant }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [pinnedId, setPinnedId] = useState(null); // per-viewer local-only, never sent to the backend

  const joined = !!myParticipant?.in_video_call;
  const camOn = !!myParticipant?.cam_on;

  useEffect(() => {
    const onRejected = (payload) => setError(payload);
    socket.on(SOCKET.VIDEO_CAM_REJECTED, onRejected);
    return () => socket.off(SOCKET.VIDEO_CAM_REJECTED, onRejected);
  }, []);

  useEffect(() => {
    service.setCamEnabled(camOn);
  }, [service, camOn]);

  // Silently resume media on a grace-period reload: the server still thinks
  // we're in the call (in_video_call survived the disconnect grace window),
  // but this is a fresh page load with no local track yet — reacquire it
  // without going through the explicit join() flow (no "Joining…" spinner).
  useEffect(() => {
    if (!joined || service.hasAnyLocalTrack()) return;
    (async () => {
      try {
        await service.ensureLocalStream({ video: true });
        service.setCamEnabled(camOn);
      } catch {
        setError({ code: 'cam_permission_denied', message: 'Camera access was denied.' });
      }
    })();
    // Intentionally runs once per mount when already joined — not re-run on
    // every camOn change, that's the effect above's job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, service]);

  const join = useCallback(async () => {
    setError(null);
    if (!isSecureContext()) {
      setError(INSECURE_CONTEXT_ERROR);
      return;
    }
    setPending(true);
    try {
      await service.ensureLocalStream({ video: true });
      // A freshly-created track defaults to enabled — force it to match the
      // current (server-confirmed) cam_on immediately. The reactive effect
      // above only fires when camOn *changes*, so without this the camera
      // stays live right after joining even though the UI shows it off.
      service.setCamEnabled(camOn);
      socket.emit(SOCKET.VIDEO_JOIN, { invite_token: inviteToken });
    } catch {
      setError({ code: 'cam_permission_denied', message: 'Camera access was denied.' });
    } finally {
      setPending(false);
    }
  }, [service, inviteToken, camOn]);

  const leave = useCallback(() => {
    socket.emit(SOCKET.VIDEO_LEAVE, { invite_token: inviteToken });
    service.releaseTracks('video');
    setPinnedId(null);
  }, [service, inviteToken]);

  const toggleCam = useCallback(async () => {
    if (!joined) return;
    const next = !camOn;
    if (next) {
      if (!isSecureContext()) {
        setError(INSECURE_CONTEXT_ERROR);
        return;
      }
      try {
        await service.ensureLocalStream({ video: true });
      } catch {
        setError({ code: 'cam_permission_denied', message: 'Camera access was denied.' });
        return;
      }
    }
    socket.emit(SOCKET.VIDEO_TOGGLE_CAM, { invite_token: inviteToken, cam_on: next });
  }, [service, inviteToken, joined, camOn]);

  return { joined, camOn, pending, error, pinnedId, setPinnedId, join, leave, toggleCam, clearError: () => setError(null) };
}
