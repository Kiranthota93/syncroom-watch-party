import { useEffect, useState } from 'react';

// Best-effort permission state via the Permissions API. Safari doesn't
// support querying 'microphone'/'camera' in all versions, so this degrades
// to 'unknown' there — callers should still attempt the real action (which
// is the only reliable way to find out) rather than gate on this value.
export function useMediaPermissions() {
  const [micPermission, setMicPermission] = useState('unknown');
  const [camPermission, setCamPermission] = useState('unknown');

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let micStatus;
    let camStatus;

    navigator.permissions.query({ name: 'microphone' }).then((status) => {
      micStatus = status;
      setMicPermission(status.state);
      status.onchange = () => setMicPermission(status.state);
    }).catch(() => {});

    navigator.permissions.query({ name: 'camera' }).then((status) => {
      camStatus = status;
      setCamPermission(status.state);
      status.onchange = () => setCamPermission(status.state);
    }).catch(() => {});

    return () => {
      if (micStatus) micStatus.onchange = null;
      if (camStatus) camStatus.onchange = null;
    };
  }, []);

  return { micPermission, camPermission };
}
