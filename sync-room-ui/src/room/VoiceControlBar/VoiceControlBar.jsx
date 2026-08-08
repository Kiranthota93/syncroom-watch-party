import PropTypes from 'prop-types';
import { IconMic, IconMicOff, IconHeadphones, IconHeadphonesOff, IconPhoneOff } from '../../components/icons';
import './VoiceControlBar.css';

function VoiceControlBar({
  joined, micOn, mutedByHost, speakerMuted, pending, disabled, disabledReason, error,
  onJoin, onLeave, onToggleMic, onToggleSpeaker,
}) {
  return (
    <div className="vcb-outer">
      {error && <div className="vcb-error">{error.message}</div>}

      {!joined ? (
        <div className="vcb-wrap">
          <button
            className="vcb-join-btn"
            onClick={onJoin}
            disabled={pending || disabled}
            title={disabled ? disabledReason : undefined}
          >
            <IconHeadphones size={16} />
            <span className="vcb-join-label">{pending ? 'Joining…' : 'Join Voice'}</span>
          </button>
        </div>
      ) : (
        <div className="vcb-wrap vcb-active">
          <span className="vcb-live-dot" />
          <span className="vcb-live-label">Live</span>

          <button
            className={`vcb-icon-btn ${!micOn ? 'vcb-icon-muted' : ''}`}
            onClick={onToggleMic}
            disabled={disabled || mutedByHost}
            title={
              mutedByHost ? 'Muted by host'
                : disabled ? disabledReason
                : micOn ? 'Mute' : 'Unmute'
            }
          >
            {micOn ? <IconMic size={16} /> : <IconMicOff size={16} />}
          </button>

          <button
            className={`vcb-icon-btn ${speakerMuted ? 'vcb-icon-muted' : ''}`}
            onClick={onToggleSpeaker}
            title={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
          >
            {speakerMuted ? <IconHeadphonesOff size={16} /> : <IconHeadphones size={16} />}
          </button>

          <button className="vcb-icon-btn vcb-leave-btn" onClick={onLeave} title="Leave voice">
            <IconPhoneOff size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

VoiceControlBar.propTypes = {
  joined: PropTypes.bool.isRequired,
  micOn: PropTypes.bool.isRequired,
  mutedByHost: PropTypes.bool,
  speakerMuted: PropTypes.bool,
  pending: PropTypes.bool,
  disabled: PropTypes.bool,
  disabledReason: PropTypes.string,
  error: PropTypes.object,
  onJoin: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
  onToggleMic: PropTypes.func.isRequired,
  onToggleSpeaker: PropTypes.func.isRequired,
};

export default VoiceControlBar;
