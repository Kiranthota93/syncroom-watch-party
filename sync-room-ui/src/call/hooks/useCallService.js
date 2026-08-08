import { useEffect, useRef, useState } from 'react';
import socket from '../../socket/socket';
import { CallService } from '../CallService';
import { getIceServers } from '../iceServers';

// One CallService per Room page session, shared between useVoiceCall and
// useVideoCall — a mesh peer connection carries both audio and video tracks.
export function useCallService({ inviteToken, participantId }) {
  const serviceRef = useRef(null);
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  const [remoteStreams, setRemoteStreams] = useState({}); // participant_id -> MediaStream
  const [ready, setReady] = useState(false);

  if (!serviceRef.current) {
    serviceRef.current = new CallService({
      socket,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // replaced once fetched below
      inviteToken,
      getParticipantId: () => participantIdRef.current,
    });
  }

  useEffect(() => {
    let cancelled = false;
    const service = serviceRef.current;

    getIceServers().then((servers) => {
      if (!cancelled) service.iceServers = servers;
    });

    service.start();
    setReady(true);

    const offStream = service.on('remoteStream', (id, stream) => {
      setRemoteStreams((prev) => ({ ...prev, [id]: stream }));
    });
    const offClosed = service.on('peerClosed', (id) => {
      setRemoteStreams((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      cancelled = true;
      offStream();
      offClosed();
      service.stop();
    };
  }, []);

  return { service: serviceRef.current, remoteStreams, ready };
}
