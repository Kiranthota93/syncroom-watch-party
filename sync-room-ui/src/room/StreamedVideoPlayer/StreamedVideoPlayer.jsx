import PropTypes from 'prop-types';
import './StreamedVideoPlayer.css';

const IconPlay = () => <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>;
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="3" width="4" height="18" rx="1" /><rect x="15" y="3" width="4" height="18" rx="1" />
  </svg>
);
const IconRewind = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12.5 20 2 12 12.5 4" /><polygon points="22.5 20 12 12 22.5 4" />
  </svg>
);
const IconForward = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="11.5 20 22 12 11.5 4" /><polygon points="1.5 20 12 12 1.5 4" />
  </svg>
);
const IconVolume = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon fill="currentColor" stroke="none" points="11 5 6 9 2 9 2 15 6 15 11 19" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);
const IconVolumeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon fill="currentColor" stroke="none" points="11 5 6 9 2 9 2 15 6 15 11 19" />
    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);
const IconExpand = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const fmt = (s) => {
  s = Math.floor(s || 0);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// Lean custom control bar for the streamed-video source. Reuses the exact
// same VideoStage handler props as the local_video path — only the markup
// (no per-file device-info/stats panels, since there's no local File here).
function StreamedVideoPlayer({
  videoRef, src, isController, controllerName,
  ctrlPlaying, ctrlTime, ctrlDuration, ctrlVolume, ctrlMuted, ctrlRate,
  viewerTime, viewerDuration, scrubValue, showControls,
  onPlayPause, onSkip, onScrubPointerDown, onScrubInput, onScrubEnd,
  onVolumeChange, onMuteToggle, onSpeedChange, onFullscreenToggle,
  onMouseMove, onMouseLeave,
}) {
  return (
    <div className="svp-root" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      <video ref={videoRef} src={src} className="svp-video" playsInline />

      {isController ? (
        <div className={`svp-controls ${showControls ? '' : 'svp-controls-hidden'}`}>
          <input
            type="range"
            min="0"
            max={ctrlDuration || 0}
            step="0.1"
            value={scrubValue}
            onPointerDown={onScrubPointerDown}
            onChange={onScrubInput}
            onPointerUp={onScrubEnd}
            className="svp-scrub"
          />
          <div className="svp-row">
            <button className="svp-btn" onClick={() => onSkip(-10)} aria-label="Rewind 10s"><IconRewind /></button>
            <button className="svp-btn svp-btn-play" onClick={onPlayPause} aria-label={ctrlPlaying ? 'Pause' : 'Play'}>
              {ctrlPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <button className="svp-btn" onClick={() => onSkip(10)} aria-label="Forward 10s"><IconForward /></button>

            <span className="svp-time">{fmt(ctrlTime)} / {fmt(ctrlDuration)}</span>

            <button className="svp-btn" onClick={onMuteToggle} aria-label={ctrlMuted ? 'Unmute' : 'Mute'}>
              {ctrlMuted ? <IconVolumeOff /> : <IconVolume />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05" value={ctrlMuted ? 0 : ctrlVolume}
              onChange={onVolumeChange} className="svp-volume"
            />

            <select className="svp-speed" value={ctrlRate} onChange={(e) => onSpeedChange(parseFloat(e.target.value))}>
              {[0.5, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}x</option>)}
            </select>

            <button className="svp-btn" onClick={onFullscreenToggle} aria-label="Fullscreen"><IconExpand /></button>
          </div>
        </div>
      ) : (
        <>
          <div className="svp-viewer-banner">
            <span className="svp-viewer-dot" /> Controlled by <strong>{controllerName}</strong>
          </div>

          {/* Personal view setting, not a playback command — every participant
              gets it, not just whoever holds control. */}
          <button
            className="svp-fullscreen-btn"
            onClick={onFullscreenToggle}
            aria-label="Fullscreen"
            title="Fullscreen (F)"
          >
            <IconExpand />
          </button>

          <div className="svp-viewer-timeline">
            <span>{fmt(viewerTime)}</span>
            <div className="svp-viewer-bar">
              <div
                className="svp-viewer-fill"
                style={{ width: viewerDuration > 0 ? `${(viewerTime / viewerDuration) * 100}%` : '0%' }}
              />
            </div>
            <span>{fmt(viewerDuration)}</span>
          </div>
        </>
      )}
    </div>
  );
}

StreamedVideoPlayer.propTypes = {
  videoRef: PropTypes.object.isRequired,
  src: PropTypes.string.isRequired,
  isController: PropTypes.bool,
  controllerName: PropTypes.string,
  ctrlPlaying: PropTypes.bool,
  ctrlTime: PropTypes.number,
  ctrlDuration: PropTypes.number,
  ctrlVolume: PropTypes.number,
  ctrlMuted: PropTypes.bool,
  ctrlRate: PropTypes.number,
  viewerTime: PropTypes.number,
  viewerDuration: PropTypes.number,
  scrubValue: PropTypes.number,
  showControls: PropTypes.bool,
  onPlayPause: PropTypes.func,
  onSkip: PropTypes.func,
  onScrubPointerDown: PropTypes.func,
  onScrubInput: PropTypes.func,
  onScrubEnd: PropTypes.func,
  onVolumeChange: PropTypes.func,
  onMuteToggle: PropTypes.func,
  onSpeedChange: PropTypes.func,
  onFullscreenToggle: PropTypes.func,
  onMouseMove: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default StreamedVideoPlayer;
