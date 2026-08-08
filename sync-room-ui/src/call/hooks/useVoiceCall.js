import { useCallback, useEffect, useState } from 'react';
import socket from '../../socket/socket';
import { SOCKET } from '../../constants/events';
import { isSecureContext, INSECURE_CONTEXT_ERROR } from '../secureContext';

// Reflects server-confirmed state (myParticipant, from room:updated) rather
// than optimistic local state — covers force-mute-on-playback and host-mute
// without a separate reconciliation path.
export function useVoiceCall({ service, inviteToken, myParticipant }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [speakingMap, setSpeakingMap] = useState({});
  // Own speaker/output volume — purely local, never observable by others or
  // sent to the backend (see RemoteAudioPlayer, which is what this actually mutes).
  const [speakerMuted, setSpeakerMuted] = useState(false);

  const joined = !!myParticipant?.in_voice_call;
  const micOn = !!myParticipant?.mic_on;
  const mutedByHost = !!myParticipant?.muted_by_host;

  useEffect(() => {
    const onRejected = (payload) => setError(payload);
    socket.on(SOCKET.VOICE_MIC_REJECTED, onRejected);
    return () => socket.off(SOCKET.VOICE_MIC_REJECTED, onRejected);
  }, []);

  useEffect(() => {
    const onSpeaking = ({ participant_id, speaking }) => {
      setSpeakingMap((prev) => ({ ...prev, [participant_id]: speaking }));
    };
    socket.on(SOCKET.VOICE_SPEAKING, onSpeaking);
    return () => socket.off(SOCKET.VOICE_SPEAKING, onSpeaking);
  }, []);

  // Keep the local track enabled/disabled in sync with server-confirmed mic_on.
  useEffect(() => {
    service.setMicEnabled(micOn);
  }, [service, micOn]);

  // Silently resume media on a grace-period reload: the server still thinks
  // we're in the call (in_voice_call survived the disconnect grace window),
  // but this is a fresh page load with no local track yet — reacquire it
  // without going through the explicit join() flow (no "Joining…" spinner).
  useEffect(() => {
    if (!joined || service.hasAnyLocalTrack()) return;
    (async () => {
      try {
        await service.ensureLocalStream({ audio: true });
        service.setMicEnabled(micOn);
      } catch {
        setError({ code: 'mic_permission_denied', message: 'Microphone access was denied.' });
      }
    })();
    // Intentionally runs once per mount when already joined — not re-run on
    // every micOn change, that's the effect above's job.
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
      await service.ensureLocalStream({ audio: true });
      // A freshly-created track defaults to enabled — force it to match the
      // current (server-confirmed) mic_on immediately. The reactive effect
      // above only fires when micOn *changes*, so without this the mic stays
      // live right after joining even though the UI shows it muted.
      service.setMicEnabled(micOn);
      socket.emit(SOCKET.VOICE_JOIN, { invite_token: inviteToken });
    } catch {
      setError({ code: 'mic_permission_denied', message: 'Microphone access was denied.' });
    } finally {
      setPending(false);
    }
  }, [service, inviteToken, micOn]);

  const leave = useCallback(() => {
    socket.emit(SOCKET.VOICE_LEAVE, { invite_token: inviteToken });
    service.releaseTracks('audio');
  }, [service, inviteToken]);

  // Turning the mic ON also joins the voice call first if not already in it —
  // lets "enable mic" work as a single action from anywhere (e.g. the Cameras
  // drawer), not just the dedicated Join Voice button.
  const toggleMic = useCallback(async () => {
    const next = !micOn;
    if (next) {
      if (!isSecureContext()) {
        setError(INSECURE_CONTEXT_ERROR);
        return;
      }
      try {
        await service.ensureLocalStream({ audio: true });
      } catch {
        setError({ code: 'mic_permission_denied', message: 'Microphone access was denied.' });
        return;
      }
      if (!joined) {
        socket.emit(SOCKET.VOICE_JOIN, { invite_token: inviteToken });
      }
    }
    socket.emit(SOCKET.VOICE_TOGGLE_MIC, { invite_token: inviteToken, mic_on: next });
  }, [service, inviteToken, joined, micOn]);

  const toggleSpeaker = useCallback(() => setSpeakerMuted((m) => !m), []);

  return {
    joined, micOn, mutedByHost, pending, error, speakingMap,
    speakerMuted, toggleSpeaker,
    join, leave, toggleMic,
    clearError: () => setError(null),
  };
}
