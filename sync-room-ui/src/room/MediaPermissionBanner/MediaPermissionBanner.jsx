import PropTypes from 'prop-types';
import { IconMic, IconCamera } from '../../components/icons';
import './MediaPermissionBanner.css';

// Grant buttons trigger the SAME action (join voice / enable camera) that a
// user gesture would — browsers only surface the permission prompt on a real
// getUserMedia() call, not a separate pre-check.
function MediaPermissionBanner({ needMic, needCam, onGrantMic, onGrantCam }) {
  if (!needMic && !needCam) return null;

  return (
    <div className="mpb-bar">
      {needMic && (
        <button className="mpb-btn" onClick={onGrantMic}>
          <IconMic size={14} /> Allow microphone
        </button>
      )}
      {needCam && (
        <button className="mpb-btn" onClick={onGrantCam}>
          <IconCamera size={14} /> Allow camera
        </button>
      )}
    </div>
  );
}

MediaPermissionBanner.propTypes = {
  needMic: PropTypes.bool,
  needCam: PropTypes.bool,
  onGrantMic: PropTypes.func,
  onGrantCam: PropTypes.func,
};

export default MediaPermissionBanner;
