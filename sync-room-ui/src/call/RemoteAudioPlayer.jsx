import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Voice chat must be audible regardless of whether the Cameras drawer is
// open — VideoCallDrawer's <video> tiles are muted (see VideoTile) so this
// is the single, always-mounted place remote audio actually plays from.
function AudioTrack({ stream, muted }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return <audio ref={ref} autoPlay muted={muted} />;
}

AudioTrack.propTypes = {
  stream: PropTypes.object.isRequired,
  muted: PropTypes.bool,
};

function RemoteAudioPlayer({ remoteStreams, muted }) {
  return (
    <>
      {Object.entries(remoteStreams).map(([participantId, stream]) => (
        <AudioTrack key={participantId} stream={stream} muted={muted} />
      ))}
    </>
  );
}

RemoteAudioPlayer.propTypes = {
  remoteStreams: PropTypes.object.isRequired,
  muted: PropTypes.bool,
};

export default RemoteAudioPlayer;
