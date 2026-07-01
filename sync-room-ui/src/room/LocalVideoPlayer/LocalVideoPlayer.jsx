import { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './LocalVideoPlayer.css';

// ── Inline SVG icons ──────────────────────────────────────────────────────────

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21"/>
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="3" width="4" height="18" rx="1"/>
    <rect x="15" y="3" width="4" height="18" rx="1"/>
  </svg>
);
const IconRewind = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon fill="currentColor" stroke="none" points="12.5 20 2 12 12.5 4"/>
    <polygon fill="currentColor" stroke="none" points="22.5 20 12 12 22.5 4"/>
  </svg>
);
const IconForward = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon fill="currentColor" stroke="none" points="11.5 20 22 12 11.5 4"/>
    <polygon fill="currentColor" stroke="none" points="1.5 20 12 12 1.5 4"/>
  </svg>
);
const IconVolumeFull = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon fill="currentColor" stroke="none" points="11 5 6 9 2 9 2 15 6 15 11 19"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconVolumeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon fill="currentColor" stroke="none" points="11 5 6 9 2 9 2 15 6 15 11 19"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconExpand = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const IconCompress = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
    <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
  </svg>
);
const IconPiP = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <rect fill="currentColor" stroke="none" x="12" y="9" width="8" height="5" rx="1"/>
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const IconActivity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconKeyboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/>
    <line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/>
    <line x1="6" y1="14" x2="18" y2="14"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (seconds) => {
  const s = Math.floor(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
};

const fmtMs = (seconds) => {
  const s = Math.floor(seconds || 0);
  const ms = Math.round(((seconds || 0) - s) * 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
};

const fmtBytes = (bytes) => {
  if (!bytes) return '—';
  const G = 1024 ** 3, M = 1024 ** 2, K = 1024;
  if (bytes >= G) return `${(bytes/G).toFixed(2)} GB`;
  if (bytes >= M) return `${(bytes/M).toFixed(1)} MB`;
  if (bytes >= K) return `${(bytes/K).toFixed(0)} KB`;
  return `${bytes} B`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ── Sub-panels ────────────────────────────────────────────────────────────────

function SpeedPanel({ current, onSelect }) {
  return (
    <div className="lp-panel">
      <div className="lp-panel-title">Playback Speed</div>
      <div className="lp-speed-grid">
        {SPEEDS.map(r => (
          <button
            key={r}
            className={`lp-speed-opt ${current === r ? 'lp-speed-active' : ''}`}
            onClick={() => onSelect(r)}
          >
            {r === 1 ? 'Normal' : `${r}×`}
            {current === r && <span className="lp-speed-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaInfoPanel({ file, videoEl, duration }) {
  const [resolution, setResolution] = useState('—');

  useEffect(() => {
    if (!videoEl) return;
    const update = () => {
      if (videoEl.videoWidth && videoEl.videoHeight) {
        setResolution(`${videoEl.videoWidth} × ${videoEl.videoHeight}`);
      }
    };
    update();
    videoEl.addEventListener('loadedmetadata', update);
    return () => videoEl.removeEventListener('loadedmetadata', update);
  }, [videoEl]);

  const rows = [
    ['File Name',   file?.name || '—'],
    ['Resolution',  resolution],
    ['Duration',    fmt(duration)],
    ['File Size',   fmtBytes(file?.size)],
    ['MIME Type',   file?.type || '—'],
    ['Codec',       'H.264 / AAC (estimated)'],
    ['Quality',     'Original file — no transcoding'],
  ];

  return (
    <div className="lp-panel">
      <div className="lp-panel-title">Media Information</div>
      <div className="lp-info-rows">
        {rows.map(([label, value]) => (
          <div key={label} className="lp-info-row">
            <span className="lp-info-label">{label}</span>
            <span className="lp-info-value" title={value}>{value}</span>
          </div>
        ))}
      </div>
      <div className="lp-info-note">
        Quality selection will be available for future streaming providers.
      </div>
    </div>
  );
}

function StatsPanel({ room, isController, controllerName, currentTime, playbackRate, isPlaying }) {
  const online = room.participants?.filter(p => p.is_online) ?? [];
  const ready  = online.filter(p => p.is_ready).length;

  const rows = [
    ['Provider',       'Local Video'],
    ['Sync Status',    isPlaying ? '● Playing' : '⏸ Paused'],
    ['Position',       fmtMs(currentTime)],
    ['Playback Rate',  `${playbackRate}×`],
    ['Controller',     controllerName || '—'],
    ['Participants',   `${online.length} online / ${ready} ready`],
    ['Room Status',    room.status ?? '—'],
    ['Your Role',      isController ? '🎮 Controller' : '👁 Viewer'],
    ['Content Type',   room.content_source?.type ?? '—'],
  ];

  return (
    <div className="lp-panel">
      <div className="lp-panel-title">Playback Statistics</div>
      <div className="lp-info-rows">
        {rows.map(([label, value]) => (
          <div key={label} className="lp-info-row">
            <span className="lp-info-label">{label}</span>
            <span className={`lp-info-value ${label === 'Sync Status' && isPlaying ? 'lp-stat-playing' : ''}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortcutsPanel() {
  const shortcuts = [
    ['Space',       'Play / Pause'],
    ['← Left',      'Seek back 10s'],
    ['→ Right',     'Seek forward 10s'],
    ['M',           'Mute / Unmute'],
    ['F',           'Toggle Fullscreen'],
    ['P',           'Picture-in-Picture'],
    ['Escape',      'Exit Fullscreen / Close panel'],
  ];

  return (
    <div className="lp-panel">
      <div className="lp-panel-title">Keyboard Shortcuts</div>
      <div className="lp-shortcuts-list">
        {shortcuts.map(([key, desc]) => (
          <div key={key} className="lp-shortcut-row">
            <kbd className="lp-key">{key}</kbd>
            <span className="lp-shortcut-desc">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────

const SETTINGS_ITEMS = [
  { id: 'speed',     icon: <IconPlay />,      label: 'Playback Speed' },
  { id: 'media',     icon: <IconInfo />,      label: 'Media Information' },
  { id: 'stats',     icon: <IconActivity />,  label: 'Playback Statistics' },
  { id: 'shortcuts', icon: <IconKeyboard />,  label: 'Keyboard Shortcuts' },
];

function SettingsPanel({
  activeTab, onTabChange, onClose,
  // pass-through to sub-panels
  playbackRate, onSpeedChange,
  file, videoEl, duration,
  room, isController, controllerName, currentTime, isPlaying,
  isPiP, isPiPSupported, onPiP,
  isFullscreen, onFullscreen,
}) {
  return (
    <div className="lp-settings" role="dialog" aria-label="Player settings">
      {activeTab ? (
        /* Sub-panel */
        <div className="lp-settings-sub">
          <button className="lp-settings-back" onClick={() => onTabChange(null)}>
            <IconChevronLeft /> Back
          </button>
          {activeTab === 'speed'     && <SpeedPanel current={playbackRate} onSelect={onSpeedChange} />}
          {activeTab === 'media'     && <MediaInfoPanel file={file} videoEl={videoEl} duration={duration} />}
          {activeTab === 'stats'     && <StatsPanel room={room} isController={isController} controllerName={controllerName} currentTime={currentTime} playbackRate={playbackRate} isPlaying={isPlaying} />}
          {activeTab === 'shortcuts' && <ShortcutsPanel />}
        </div>
      ) : (
        /* Main menu */
        <>
          <div className="lp-settings-header">
            <span>Settings</span>
            <button className="lp-icon-btn" onClick={onClose} aria-label="Close settings"><IconX /></button>
          </div>

          <div className="lp-settings-menu">
            {SETTINGS_ITEMS.map(({ id, icon, label }) => (
              <button key={id} className="lp-settings-item" onClick={() => onTabChange(id)}>
                <span className="lp-settings-item-icon">{icon}</span>
                <span className="lp-settings-item-label">{label}</span>
                {id === 'speed' && (
                  <span className="lp-settings-item-badge">{playbackRate === 1 ? 'Normal' : `${playbackRate}×`}</span>
                )}
                <IconChevronRight />
              </button>
            ))}

            <div className="lp-settings-divider" />

            {isPiPSupported && (
              <button className="lp-settings-item" onClick={() => { onPiP(); onClose(); }}>
                <span className="lp-settings-item-icon"><IconPiP /></span>
                <span className="lp-settings-item-label">
                  {isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                </span>
              </button>
            )}

            <button className="lp-settings-item" onClick={() => { onFullscreen(); onClose(); }}>
              <span className="lp-settings-item-icon">{isFullscreen ? <IconCompress /> : <IconExpand />}</span>
              <span className="lp-settings-item-label">
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LocalVideoPlayer({
  // Video element
  videoRef,

  // Playback state (controller)
  isController,
  ctrlPlaying,
  ctrlTime,
  ctrlDuration,
  ctrlVolume,
  ctrlMuted,
  ctrlRate,
  ctrlFullscreen,
  isPiP,
  scrubValue,
  isDraggingRef,

  // Viewer state
  viewerTime,
  viewerDuration,

  // Room / session
  room,
  controllerName,
  onlineParticipants,
  readyCount,
  allReady,

  // File
  localFile,

  // Handlers (controller)
  onPlayPause,
  onSkip,
  onScrubPointerDown,
  onScrubInput,
  onScrubEnd,
  onVolumeChange,
  onMuteToggle,
  onSpeedChange,
  onFullscreenToggle,
  onPiPToggle,
  onMouseMove,
  onMouseLeave,
  showControls,

  // Handlers (shared)
  onChangeFile,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab,  setSettingsTab]  = useState(null);
  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  const displayTime     = isDraggingRef?.current ? scrubValue : ctrlTime;
  const scrubMax        = ctrlDuration || 100;

  // Close settings when clicking outside
  const settingsRef = useRef(null);
  useEffect(() => {
    if (!showSettings) return;
    const handle = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
        setSettingsTab(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showSettings]);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setSettingsTab(null);
  }, []);

  const handleSettingsToggle = useCallback(() => {
    setShowSettings(v => !v);
    setSettingsTab(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div
      className="lp-root"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="lp-video"
        controls={false}
        playsInline
      />

      {/* ── Meta bar (top) ──────────────────────────────── */}
      <div className="lp-meta-bar">
        {isController ? (
          <div className="lp-meta-left">
            <span className={`lp-ready-badge ${allReady ? 'lp-ready-all' : ''}`}>
              {allReady
                ? '✓ Everyone ready'
                : `${readyCount} / ${onlineParticipants.length} ready`}
            </span>
          </div>
        ) : (
          <div className="lp-meta-left">
            <span className="lp-controlled-by">
              <span className="lp-ctrl-dot" />
              Controlled by <strong>{controllerName}</strong>
            </span>
          </div>
        )}
        <button className="lp-change-btn" onClick={onChangeFile}>
          Change File
        </button>
      </div>

      {/* ── Non-controller: viewer timeline (bottom) ─────── */}
      {!isController && (
        <div className="lp-viewer-timeline">
          <span className="lp-time-chip">{fmt(viewerTime)}</span>
          <div className="lp-viewer-track">
            <div
              className="lp-viewer-fill"
              style={{ width: viewerDuration > 0 ? `${(viewerTime / viewerDuration) * 100}%` : '0%' }}
            />
          </div>
          <span className="lp-time-chip">{fmt(viewerDuration)}</span>
        </div>
      )}

      {/* ── Controller: full controls ─────────────────────── */}
      {isController && (
        <div className={`lp-controls ${showControls ? 'lp-controls-visible' : ''}`}>

          {/* Progress bar */}
          <div className="lp-progress-wrap">
            <div className="lp-progress-time-preview">
              {fmt(isDraggingRef?.current ? scrubValue : ctrlTime)}
            </div>
            <div className="lp-progress-track-wrap">
              <div
                className="lp-progress-fill"
                style={{ width: scrubMax > 0 ? `${((isDraggingRef?.current ? scrubValue : ctrlTime) / scrubMax) * 100}%` : '0%' }}
              />
              <input
                type="range"
                className="lp-scrubber"
                min={0}
                max={scrubMax}
                step={0.1}
                value={isDraggingRef?.current ? scrubValue : ctrlTime}
                onPointerDown={onScrubPointerDown}
                onInput={onScrubInput}
                onPointerUp={onScrubEnd}
                aria-label="Seek"
              />
            </div>
          </div>

          {/* Control bar */}
          <div className="lp-bar">

            {/* Left group */}
            <div className="lp-group">
              <button className="lp-ctrl-btn lp-play-btn" onClick={onPlayPause} aria-label={ctrlPlaying ? 'Pause' : 'Play'}>
                {ctrlPlaying ? <IconPause /> : <IconPlay />}
              </button>

              <button className="lp-ctrl-btn" onClick={() => onSkip(-10)} aria-label="Rewind 10 seconds">
                <IconRewind />
                <span className="lp-skip-label">10</span>
              </button>

              <button className="lp-ctrl-btn" onClick={() => onSkip(10)} aria-label="Forward 10 seconds">
                <span className="lp-skip-label">10</span>
                <IconForward />
              </button>

              {/* Volume */}
              <div className="lp-vol-group" role="group" aria-label="Volume">
                <button className="lp-ctrl-btn" onClick={onMuteToggle} aria-label={ctrlMuted ? 'Unmute' : 'Mute'}>
                  {ctrlMuted || ctrlVolume === 0 ? <IconVolumeOff /> : <IconVolumeFull />}
                </button>
                <input
                  type="range"
                  className="lp-vol-slider"
                  min={0} max={1} step={0.05}
                  value={ctrlMuted ? 0 : ctrlVolume}
                  onChange={onVolumeChange}
                  aria-label="Volume"
                />
              </div>

              {/* Time */}
              <div className="lp-time" aria-live="off">
                <span>{fmt(displayTime)}</span>
                <span className="lp-time-sep">/</span>
                <span className="lp-time-total">{fmt(ctrlDuration)}</span>
              </div>
            </div>

            {/* Right group */}
            <div className="lp-group">
              {/* Speed badge */}
              <button
                className="lp-ctrl-btn lp-speed-badge"
                onClick={() => { setShowSettings(true); setSettingsTab('speed'); }}
                aria-label={`Playback speed: ${ctrlRate}×`}
              >
                {ctrlRate === 1 ? '1×' : `${ctrlRate}×`}
              </button>

              {/* PiP */}
              {isPiPSupported && (
                <button className="lp-ctrl-btn" onClick={onPiPToggle} aria-label="Picture-in-Picture">
                  <IconPiP />
                </button>
              )}

              {/* Settings */}
              <div className="lp-settings-anchor" ref={settingsRef}>
                <button
                  className={`lp-ctrl-btn ${showSettings ? 'lp-ctrl-active' : ''}`}
                  onClick={handleSettingsToggle}
                  aria-label="Settings"
                  aria-expanded={showSettings}
                >
                  <IconSettings />
                </button>

                {showSettings && (
                  <SettingsPanel
                    activeTab={settingsTab}
                    onTabChange={setSettingsTab}
                    onClose={closeSettings}
                    playbackRate={ctrlRate}
                    onSpeedChange={(r) => { onSpeedChange(r); closeSettings(); }}
                    file={localFile}
                    videoEl={videoRef?.current}
                    duration={ctrlDuration}
                    room={room}
                    isController={isController}
                    controllerName={controllerName}
                    currentTime={ctrlTime}
                    isPlaying={ctrlPlaying}
                    isPiP={isPiP}
                    isPiPSupported={isPiPSupported}
                    onPiP={onPiPToggle}
                    isFullscreen={ctrlFullscreen}
                    onFullscreen={onFullscreenToggle}
                  />
                )}
              </div>

              {/* Fullscreen */}
              <button className="lp-ctrl-btn" onClick={onFullscreenToggle} aria-label={ctrlFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {ctrlFullscreen ? <IconCompress /> : <IconExpand />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

LocalVideoPlayer.propTypes = {
  videoRef:           PropTypes.object.isRequired,
  isController:       PropTypes.bool,
  ctrlPlaying:        PropTypes.bool,
  ctrlTime:           PropTypes.number,
  ctrlDuration:       PropTypes.number,
  ctrlVolume:         PropTypes.number,
  ctrlMuted:          PropTypes.bool,
  ctrlRate:           PropTypes.number,
  ctrlFullscreen:     PropTypes.bool,
  isPiP:              PropTypes.bool,
  scrubValue:         PropTypes.number,
  isDraggingRef:      PropTypes.object,
  viewerTime:         PropTypes.number,
  viewerDuration:     PropTypes.number,
  room:               PropTypes.object.isRequired,
  controllerName:     PropTypes.string,
  onlineParticipants: PropTypes.array,
  readyCount:         PropTypes.number,
  allReady:           PropTypes.bool,
  localFile:          PropTypes.object,
  onPlayPause:        PropTypes.func,
  onSkip:             PropTypes.func,
  onScrubPointerDown: PropTypes.func,
  onScrubInput:       PropTypes.func,
  onScrubEnd:         PropTypes.func,
  onVolumeChange:     PropTypes.func,
  onMuteToggle:       PropTypes.func,
  onSpeedChange:      PropTypes.func,
  onFullscreenToggle: PropTypes.func,
  onPiPToggle:        PropTypes.func,
  onMouseMove:        PropTypes.func,
  onMouseLeave:       PropTypes.func,
  showControls:       PropTypes.bool,
  onChangeFile:       PropTypes.func,
};
