import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Avatar from '../Avatar/Avatar';
import { IconMic, IconMicOff, IconCamera, IconCameraOff, IconPin, IconMaximize, IconHeadphones } from '../../components/icons';
import './VideoCallDrawer.css';

function VideoTile({ participant, stream, isLocal, pinned, onPin, size = 'normal' }) {
  const videoRef = useRef(null);

  // hasVideo (below) conditionally mounts/unmounts this <video> element —
  // each time it remounts, videoRef.current is a BRAND NEW DOM node, so this
  // effect must re-run and reattach even though `stream` itself didn't
  // change. Depending on [stream] alone left every remount with an empty,
  // blank <video> tag (nothing was ever attached to the new node).
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  });

  // Always trust the server-synced `cam_on` field, never the WebRTC track's
  // own `.enabled` — for remote peers it never reflects the sender's actual
  // state (it's a purely local property, not part of the negotiated media
  // state — they just send black frames while "off"). It's tempting to read
  // the local track directly for "instant" feedback, but that races the
  // effect that actually flips `track.enabled`: that effect runs strictly
  // *after* this render commits, so the very render where `cam_on` first
  // turns true still sees the old value and renders the avatar — and since
  // nothing re-renders afterward (mutating a track isn't a React state
  // update), it gets stuck until something else forces a remount.
  const hasVideo = participant.cam_on && !!stream?.getVideoTracks().length;

  return (
    <div className={`vcd-tile ${size === 'large' ? 'vcd-tile-large' : ''} ${pinned ? 'vcd-tile-pinned' : ''}`}>
      {hasVideo ? (
        // Always muted — audio plays via the always-mounted RemoteAudioPlayer
        // regardless of whether this drawer is open, so this tile is video-only.
        <video ref={videoRef} autoPlay playsInline muted className="vcd-video" />
      ) : (
        <div className="vcd-tile-fallback">
          <Avatar name={participant.display_name} size={size === 'large' ? 'lg' : 'md'} />
        </div>
      )}

      <div className="vcd-tile-footer">
        <span className="vcd-tile-mic">
          {participant.mic_on ? <IconMic size={13} /> : <IconMicOff size={13} />}
        </span>
        <span className="vcd-tile-name">{isLocal ? `${participant.display_name} (you)` : participant.display_name}</span>
      </div>

      <button className="vcd-tile-pin" onClick={onPin} title={pinned ? 'Unpin' : 'Pin'}>
        {size === 'large' ? <IconMaximize size={13} /> : <IconPin size={13} />}
      </button>
    </div>
  );
}

VideoTile.propTypes = {
  participant: PropTypes.object.isRequired,
  stream: PropTypes.object,
  isLocal: PropTypes.bool,
  pinned: PropTypes.bool,
  onPin: PropTypes.func,
  size: PropTypes.oneOf(['normal', 'large']),
};

function VideoCallDrawer({
  open, onOpenChange, participants, myParticipantId, remoteStreams, localStream,
  joined, camOn, pinnedId, setPinnedId, pending, disabled, disabledReason, error,
  onJoin, onLeave, onToggleCam,
  micOn, mutedByHost, onToggleMic,
}) {
  if (!open) return null;

  const inCall = participants.filter((p) => p.in_video_call && p.is_online);
  const pinned = inCall.find((p) => p.participant_id === pinnedId);
  const grid = inCall.filter((p) => p.participant_id !== pinnedId);

  const streamFor = (p) => (p.participant_id === myParticipantId ? localStream : remoteStreams[p.participant_id]);

  return createPortal(
    <div className="vcd-overlay" onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div className="vcd-panel" role="dialog" aria-label="Cameras">
        <div className="vcd-header">
          <h3>Cameras</h3>
          <span className="vcd-count">{inCall.length}</span>
          <button className="vcd-close" onClick={() => onOpenChange(false)} aria-label="Close">✕</button>
        </div>

        {error && <div className="vcd-error">{error.message}</div>}

        <div className="vcd-body">
          {pinned && (
            <VideoTile
              participant={pinned}
              stream={streamFor(pinned)}
              isLocal={pinned.participant_id === myParticipantId}
              pinned
              onPin={() => setPinnedId(null)}
              size="large"
            />
          )}

          <div className="vcd-grid">
            {grid.length === 0 && !pinned && (
              <div className="vcd-empty">No one has their camera on yet.</div>
            )}
            {grid.map((p) => (
              <VideoTile
                key={p.participant_id}
                participant={p}
                stream={streamFor(p)}
                isLocal={p.participant_id === myParticipantId}
                onPin={() => setPinnedId(p.participant_id)}
              />
            ))}
          </div>
        </div>

        <div className="vcd-footer">
          <button
            className={`vcd-toggle-btn ${!micOn ? 'vcd-toggle-off' : ''}`}
            onClick={onToggleMic}
            disabled={disabled || mutedByHost}
            title={mutedByHost ? 'Muted by host' : disabled ? disabledReason : undefined}
          >
            {micOn ? <IconMic size={15} /> : <IconMicOff size={15} />} {micOn ? 'Turn off Mic' : 'Turn on Mic'}
          </button>

          {!joined ? (
            <button
              className="vcd-join-btn"
              onClick={onJoin}
              disabled={pending || disabled}
              title={disabled ? disabledReason : undefined}
            >
              <IconHeadphones size={15} /> {pending ? 'Joining…' : 'Join Cameras'}
            </button>
          ) : (
            <>
              <button
                className={`vcd-toggle-btn ${!camOn ? 'vcd-toggle-off' : ''}`}
                onClick={onToggleCam}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
              >
                {camOn ? <IconCamera size={15} /> : <IconCameraOff size={15} />} {camOn ? 'Turn off Camera' : 'Turn on Camera'}
              </button>
              <button className="vcd-leave-btn" onClick={onLeave}>Leave Cameras</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

VideoCallDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  participants: PropTypes.array.isRequired,
  myParticipantId: PropTypes.string,
  remoteStreams: PropTypes.object.isRequired,
  localStream: PropTypes.object,
  joined: PropTypes.bool.isRequired,
  camOn: PropTypes.bool.isRequired,
  pinnedId: PropTypes.string,
  setPinnedId: PropTypes.func.isRequired,
  pending: PropTypes.bool,
  disabled: PropTypes.bool,
  disabledReason: PropTypes.string,
  error: PropTypes.object,
  onJoin: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
  onToggleCam: PropTypes.func.isRequired,
  micOn: PropTypes.bool.isRequired,
  mutedByHost: PropTypes.bool,
  onToggleMic: PropTypes.func.isRequired,
};

export default VideoCallDrawer;
