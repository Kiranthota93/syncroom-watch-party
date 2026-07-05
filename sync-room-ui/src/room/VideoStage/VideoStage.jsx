import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import YouTube from "react-youtube";
import { getPrefs } from "../../hooks/usePreferences";

import nodeAPI from "../../services/api";
import extractVideoId from "../../utils/extractVideoId";
import extractFileMetadata from "../../utils/extractFileMetadata";
import validateFileMetadata from "../../utils/validateFileMetadata";
import YouTubeProvider    from "../../content/providers/YouTubeProvider";
import LocalVideoProvider from "../../content/providers/LocalVideoProvider";
import LocalVideoPlayer   from "../LocalVideoPlayer/LocalVideoPlayer";
import { usePlayback } from "../../content/hooks/usePlayback";
import { createLogger } from "../../utils/logger";

const log = createLogger("VideoStage");

import "./VideoStage.css";

const IconPlayCircle = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon fill="white" stroke="none" points="10 8 16 12 10 16 10 8"/>
  </svg>
);

const IconUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconScreen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <polygon fill="currentColor" stroke="none" points="10 8 15 11 10 14 10 8"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
);

const IconFilm = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2"/>
    <line x1="7" y1="2" x2="7" y2="22"/>
    <line x1="17" y1="2" x2="17" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="2" y1="7" x2="7" y2="7"/>
    <line x1="2" y1="17" x2="7" y2="17"/>
    <line x1="17" y1="17" x2="22" y2="17"/>
    <line x1="17" y1="7" x2="22" y2="7"/>
  </svg>
);

const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

// ── Custom player control icons ──────────────────────────────────
const IconPlay2 = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconPause2 = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/>
  </svg>
);
const IconRewind = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <polygon points="12.5 20 2 12 12.5 4 12.5 20"/>
    <polygon points="22.5 20 12 12 22.5 4 22.5 20"/>
    <text x="5" y="28" fontSize="0">-10</text>
  </svg>
);
const IconForward = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <polygon points="11.5 20 22 12 11.5 4 11.5 20"/>
    <polygon points="1.5 20 12 12 1.5 4 1.5 20"/>
  </svg>
);
const IconVolumeFull = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <polygon fill="white" stroke="none" points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);
const IconVolumeMute = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <polygon fill="white" stroke="none" points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);
const IconExpand = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const IconCompress = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
    <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
  </svg>
);

function VideoStage({ room, refreshRoom }) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");

  const youtubeAllowed = room.settings?.allow_youtube !== false;
  const localVideoAllowed = room.settings?.allow_local_video !== false;

  const selectSource = async (type) => {
    if (type === "youtube" && !youtubeAllowed) return;
    if (type === "local_video" && !localVideoAllowed) return;
    try {
      const user = JSON.parse(localStorage.getItem("syncroom_user") || "{}");
      await nodeAPI.post("/rooms/content", {
        room_code:      room.room_code,
        participant_id: user.participant_id,
        content_source: { type, metadata: {} },
      });
      refreshRoom();
    } catch (err) {
      log.error("selectSource failed", err);
    }
  };
  const [loading, setLoading] = useState(false);
  const [viewerTime, setViewerTime] = useState(0);
  const [viewerDuration, setViewerDuration] = useState(0);

  // Tracks the raw YouTube player state (0 ended, 1 playing, 2 paused, 3 buffering)
  // so the controller's suggestion-click guard (below) knows when to appear.
  const [ytPlayerState, setYtPlayerState] = useState(null);

  // Holds the active MediaProvider instance
  const providerRef    = useRef(null);
  const localVideoRef  = useRef(null);

const [localFile,       setLocalFile]       = useState(null);
  const [localFileError,  setLocalFileError]  = useState("");
  const [extractingMeta,  setExtractingMeta]  = useState(false);
  const [playerError,     setPlayerError]     = useState(null);

  // Custom player controls state (controller only)
  const [ctrlPlaying,    setCtrlPlaying]    = useState(false);
  const [ctrlTime,       setCtrlTime]       = useState(0);
  const [ctrlDuration,   setCtrlDuration]   = useState(0);
  const [ctrlVolume,     setCtrlVolume]     = useState(() => getPrefs().volume);
  const [ctrlMuted,      setCtrlMuted]      = useState(false);
  const [ctrlRate,       setCtrlRate]       = useState(() => getPrefs().playbackSpeed);
  const [ctrlFullscreen, setCtrlFullscreen] = useState(false);
  const [isPiP,          setIsPiP]          = useState(false);
  const [showControls,   setShowControls]   = useState(true);
  const [showSpeedMenu,  setShowSpeedMenu]  = useState(false);
  const [scrubValue,     setScrubValue]     = useState(0);
  const isDraggingRef    = useRef(false);
  const controlsTimerRef = useRef(null);

  const currentUser = JSON.parse(
    localStorage.getItem("syncroom_user") || "{}"
  );

  const isController =
    currentUser?.participant_id === room.controller_participant_id;

  const controllerParticipant = room.participants?.find(
    (p) => p.participant_id === room.controller_participant_id
  );
  const controllerName = controllerParticipant?.display_name || "Controller";

  const contentType = room.content_source?.type;
  const videoId     = room.content_source?.metadata?.video_id;
  const onlineCount = room.participants?.filter((p) => p.is_online).length || 0;

  // Playback engine + service — all sync and socket logic lives here
  const { setProvider, applyJoinSync, notifySeekStarted } = usePlayback({
    inviteToken:  room.invite_token,
    isController,
  });

  // ── Format helpers ────────────────────────────────────────────

  const formatBytes = (bytes) => {
    if (!bytes) return "";
    const GiB = 1024 ** 3;
    const MiB = 1024 ** 2;
    const KiB = 1024;
    if (bytes >= GiB) return `${(bytes / GiB).toFixed(1)} GB`;
    if (bytes >= MiB) return `${(bytes / MiB).toFixed(1)} MB`;
    if (bytes >= KiB) return `${(bytes / KiB).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${m}:${String(sec).padStart(2,"0")}`;
  };

  // ── Local file selection ──────────────────────────────────────

  // Apply saved preferences when a local file is loaded
  useEffect(() => {
    if (!localFile || !isController) return;
    const el = localVideoRef.current;
    if (!el) return;
    const { volume, playbackSpeed } = getPrefs();
    el.volume       = volume;
    el.playbackRate = playbackSpeed;
  }, [localFile, isController]);

  // Poll video element for custom controls state (controller only)
  useEffect(() => {
    if (!localFile || !isController) return;
    const interval = setInterval(() => {
      const el = localVideoRef.current;
      if (!el || !el.duration) return;
      if (!isDraggingRef.current) {
        setCtrlTime(el.currentTime);
        setScrubValue(el.currentTime);
      }
      setCtrlDuration(el.duration);
      setCtrlPlaying(!el.paused && !el.ended);
      setCtrlVolume(el.volume);
      setCtrlMuted(el.muted);
      setCtrlRate(el.playbackRate);
    }, 100);
    return () => clearInterval(interval);
  }, [localFile, isController]);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => setCtrlFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Track Picture-in-Picture changes
  useEffect(() => {
    const onPiPChange = () => setIsPiP(Boolean(document.pictureInPictureElement));
    document.addEventListener("pictureInPictureChange", onPiPChange);
    return () => document.removeEventListener("pictureInPictureChange", onPiPChange);
  }, []);

  // ── Custom control handlers ───────────────────────────────────

  const handleShowControls = () => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handlePlayPause = () => {
    const el = localVideoRef.current;
    if (!el) return;
    el.paused ? el.play().catch(() => {}) : el.pause();
  };

  const handleSkip = (seconds) => {
    const el = localVideoRef.current;
    if (!el) return;
    notifySeekStarted(); // suppress heartbeat before currentTime changes
    el.currentTime = Math.max(0, Math.min(el.currentTime + seconds, el.duration || 0));
  };

  const handleScrubInput = (e) => {
    isDraggingRef.current = true;
    setScrubValue(parseFloat(e.target.value));
  };

  const handleScrubEnd = (e) => {
    const time = parseFloat(e.target.value);
    notifySeekStarted(); // suppress heartbeat before currentTime changes
    if (localVideoRef.current) localVideoRef.current.currentTime = time;
    isDraggingRef.current = false;
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    if (localVideoRef.current) {
      localVideoRef.current.volume = vol;
      localVideoRef.current.muted = vol === 0;
    }
  };

  const handleMuteToggle = () => {
    const el = localVideoRef.current;
    if (el) el.muted = !el.muted;
  };

  const handleSpeedChange = (rate) => {
    if (localVideoRef.current) localVideoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  };

  const handleFullscreenToggle = () => {
    const container = localVideoRef.current?.closest(".lp-root") ?? localVideoRef.current?.closest(".player-container");
    if (!container) return;
    document.fullscreenElement
      ? document.exitFullscreen()
      : container.requestFullscreen();
  };

  const handlePiPToggle = () => {
    const el = localVideoRef.current;
    if (!el) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      el.requestPictureInPicture().catch(() => {});
    }
  };

  // Keyboard shortcuts — only active when local video is loaded
  useEffect(() => {
    if (!localFile) return;
    const onKey = (e) => {
      // Don't intercept when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!isController) return; // only controller uses shortcuts
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'm':
        case 'M':
          handleMuteToggle();
          break;
        case 'f':
        case 'F':
          handleFullscreenToggle();
          break;
        case 'p':
        case 'P':
          handlePiPToggle();
          break;
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen();
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFile, isController, ctrlMuted]);

  const handleChangeFile = async () => {
    setLocalFile(null);
    setLocalFileError("");
    try {
      await nodeAPI.post("/rooms/ready", {
        invite_token:   room.invite_token,
        participant_id: currentUser.participant_id,
        is_ready:       false,
      });
      refreshRoom();
    } catch (err) {
      log.error("Failed to mark unready", err);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setLocalFileError("Please select a valid video file.");
      return;
    }
    setLocalFileError("");
    setExtractingMeta(true);

    try {
      const extracted = await extractFileMetadata(file);

      if (isController) {
        // Controller sets the reference — no validation needed
        setLocalFile(file);
        await nodeAPI.post("/rooms/content", {
          room_code:      room.room_code,
          participant_id: currentUser.participant_id,
          content_source: { type: "local_video", metadata: extracted },
        });
        await nodeAPI.post("/rooms/ready", {
          invite_token:   room.invite_token,
          participant_id: currentUser.participant_id,
        });
        refreshRoom();
      } else {
        // Non-controller: validate against room's expected metadata
        const expected = room.content_source?.metadata;
        const { valid, errors } = validateFileMetadata(extracted, expected);

        if (!valid) {
          setLocalFileError(errors[0]);
          return;
        }

        setLocalFile(file);
        await nodeAPI.post("/rooms/ready", {
          invite_token:   room.invite_token,
          participant_id: currentUser.participant_id,
        });
        refreshRoom();
      }
    } catch (err) {
      log.error("File selection failed", err);
      setLocalFileError("An error occurred. Please try again.");
    } finally {
      setExtractingMeta(false);
    }
  };

  // Wire LocalVideoProvider when a file is selected and the <video> el is ready
  useEffect(() => {
    if (!localFile || !localVideoRef.current) return;

    const provider = new LocalVideoProvider();
    provider.attachElement(localVideoRef.current, localFile);
    providerRef.current = provider;
    setProvider(provider);

    const onReady = () => applyJoinSync(room.playback_state);
    const onError = ({ message }) => setPlayerError(message || "Video playback failed.");

    provider.on("ready", onReady);
    provider.on("error", onError);

    return () => {
      provider.off("ready", onReady);
      provider.off("error", onError);
      provider.destroy();
      providerRef.current = null;
      setProvider(null);
    };
  }, [localFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset local state and error when content type changes
  useEffect(() => {
    setPlayerError(null);
    if (contentType !== "local_video") {
      setLocalFile(null);
      setLocalFileError("");
    }
  }, [contentType]);

  // When the YouTube video is cleared (content switch / reset), destroy the
  // YouTubeProvider so it doesn't linger in the engine.
  useEffect(() => {
    if (videoId) return;
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
      setProvider(null);
    }
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the tracked YouTube player state whenever the video changes, so a
  // stale "paused"/"ended" value from the previous video can't leave the
  // suggestion-click guard (below) showing over a freshly loaded video.
  useEffect(() => {
    setYtPlayerState(null);
  }, [videoId]);

  // Viewer timeline polling — works for both YouTube and local video
  const hasActiveContent = Boolean(videoId || localFile);

  useEffect(() => {
    if (!hasActiveContent || isController) return;
    const interval = setInterval(() => {
      setViewerTime(providerRef.current?.getCurrentTime() || 0);
      setViewerDuration(providerRef.current?.getDuration() || 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveContent, isController]);

  // ── URL input ─────────────────────────────────────────────────

  // ── Error handling ───────────────────────────────────────────

  const YOUTUBE_ERRORS = {
    2:   "Invalid video URL — check the link and try again.",
    5:   "This video cannot be played in an embedded player.",
    100: "This video is unavailable or has been removed.",
    101: "The video owner has disabled embedded playback.",
    150: "The video owner has disabled embedded playback.",
  };

  const handleYouTubeError = (event) => {
    const msg = YOUTUBE_ERRORS[event.data]
      || "YouTube playback error. The video may be private or region-locked.";
    setPlayerError(msg);
  };

  const handleDismissError = async () => {
    setPlayerError(null);
    if (contentType === "local_video") {
      setLocalFile(null);
      try {
        await nodeAPI.post("/rooms/ready", {
          invite_token:   room.invite_token,
          participant_id: currentUser.participant_id,
          is_ready:       false,
        });
        refreshRoom();
      } catch (err) {
        log.error("Failed to mark unready after player error", err);
      }
    }
  };

  const handleLoadVideo = async () => {
    const id = extractVideoId(urlInput.trim());
    if (!id) {
      setUrlError("Couldn't find a valid YouTube video ID in that URL.");
      return;
    }
    setUrlError("");
    setLoading(true);
    try {
      await nodeAPI.post("/rooms/content", {
        room_code:      room.room_code,
        participant_id: currentUser.participant_id,
        content_source: { type: "youtube", metadata: { video_id: id } },
      });
      refreshRoom();
    } catch (err) {
      setUrlError(err?.response?.data?.message || "Failed to load video");
    } finally {
      setLoading(false);
    }
  };

  // ── YouTube player callbacks → forward to provider ────────────
  // VideoStage never emits socket events directly.
  // It only notifies the provider; the engine handles the rest.

  const handleReady = (event) => {
    const provider = new YouTubeProvider();
    provider.attachPlayer(event.target);
    providerRef.current = provider;

    // Wire provider into the engine, then seek to current room position
    setProvider(provider);
    applyJoinSync(room.playback_state);

    setViewerDuration(event.target.getDuration() || 0);
  };

  const handlePlay = (event) => {
    providerRef.current?.notifyPlay(event.target.getCurrentTime());
  };

  const handlePause = (event) => {
    providerRef.current?.notifyPause(event.target.getCurrentTime());
  };

  const handleStateChange = (event) => {
    setYtPlayerState(event.data);
    providerRef.current?.notifyStateChange(
      event.data,
      event.target.getCurrentTime()
    );
  };

  const handleRateChange = (event) => {
    providerRef.current?.notifyRateChange(event.data);
  };

  const handleEnd = () => {
    providerRef.current?.notifyEnd();
  };

  // ── Time formatter ────────────────────────────────────────────

  const formatPlayerTime = (seconds) => {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  // ── Render ────────────────────────────────────────────────────

  // ── Player error state ───────────────────────────────────────
  if (playerError) {
    return (
      <section className="video-stage">
        <div className="video-stage-content">
          <div className="stage-icon stage-icon-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <circle cx="12" cy="16" r="0.5" fill="white"/>
            </svg>
          </div>

          <h2>Playback Error</h2>
          <p>{playerError}</p>

          <button className="error-retry-btn" onClick={handleDismissError}>
            {contentType === "local_video" ? "Choose a Different File" : "Dismiss"}
          </button>
        </div>
      </section>
    );
  }

  // No source selected
  if (!contentType) {
    return (
      <section className="video-stage">
        <div className="video-stage-content">
          <div className="stage-icon"><IconPlayCircle /></div>
          <h2>No content selected yet</h2>
          {isController ? (
            <p>Pick a YouTube video or a local file below —<br />your friends will see it instantly.</p>
          ) : (
            <p>Waiting for {controllerName} to pick something to watch…</p>
          )}
          <div className="room-count"><IconUsers /> {onlineCount} online</div>
          {isController && (
            <div className="source-buttons">
              {youtubeAllowed && (
                <button className="source-btn" onClick={() => selectSource("youtube")}><IconScreen /> YouTube</button>
              )}
              {localVideoAllowed && (
                <button className="source-btn" onClick={() => selectSource("local_video")}><IconFilm /> Local Video</button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // YouTube selected — no video loaded yet
  if (contentType === "youtube" && !videoId) {
    return (
      <section className="video-stage">
        <div className="video-stage-content">
          <div className="stage-icon stage-icon-yt"><IconLink /></div>
          <h2>Paste a YouTube link</h2>

          {isController ? (
            <div className="url-input-group">
              <div className="url-input-row">
                <input
                  type="text"
                  className={`url-input ${urlError ? "url-input-error" : ""}`}
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
                />
                <button
                  className="url-load-btn"
                  onClick={handleLoadVideo}
                  disabled={loading || !urlInput.trim()}
                >
                  {loading ? "Loading…" : "Load"}
                </button>
              </div>
              {urlError && <p className="url-error">{urlError}</p>}
              <p className="url-hint">Supports youtube.com and youtu.be links</p>
            </div>
          ) : (
            <p className="waiting-text">
              Waiting for the controller to paste a video link…
            </p>
          )}

          <div className="room-count"><IconUsers /> {onlineCount} online</div>
        </div>
      </section>
    );
  }

  // YouTube player active
  if (contentType === "youtube" && videoId) {
    return (
      <section className="video-stage video-stage-player">
        <div className="player-container">
          <YouTube
            videoId={videoId}
            className="youtube-player"
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay:   0,
                controls:   isController ? 1 : 0,
                modestbranding: 1,
                rel:        0,
                disablekb:  isController ? 0 : 1,
              },
            }}
            onReady={handleReady}
            onPlay={handlePlay}
            onPause={handlePause}
            onStateChange={handleStateChange}
            onPlaybackRateChange={handleRateChange}
            onEnd={handleEnd}
            onError={handleYouTubeError}
          />

          {/* Blocks clicks on YouTube's own paused/ended suggested-video overlay,
              which would otherwise swap the iframe to a different video for this
              user only (no socket event fires — it's a native YouTube UI action).
              Leaves the bottom native control strip clickable so pause/seek/volume
              still work; clicking the guard itself resumes playback. */}
          {isController && (ytPlayerState === 2 || ytPlayerState === 0) && (
            <div
              className="player-suggest-guard"
              onClick={() => {
                if (ytPlayerState === 0) providerRef.current?.seekTo(0);
                providerRef.current?.play();
              }}
              role="button"
              aria-label={ytPlayerState === 0 ? "Replay video" : "Resume video"}
            >
              <span className="player-suggest-guard-icon">
                {ytPlayerState === 0 ? "↺" : "▶"}
              </span>
            </div>
          )}

          {!isController && (
            <>
              <div className="player-overlay" />

              <div className="player-viewer-banner">
                <span className="player-viewer-dot" />
                Controlled by <strong>{controllerName}</strong>
              </div>

              <div className="viewer-timeline">
                <span className="viewer-time">{formatPlayerTime(viewerTime)}</span>
                <div className="viewer-progress-bar">
                  <div
                    className="viewer-progress-fill"
                    style={{
                      width: viewerDuration > 0
                        ? `${(viewerTime / viewerDuration) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <span className="viewer-time">{formatPlayerTime(viewerDuration)}</span>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  // Local video — file not yet selected
  if (contentType === "local_video" && !localFile) {
    const meta               = room.content_source?.metadata;
    const hasHint            = Boolean(meta?.filename);
    const onlineParticipants = room.participants?.filter((p) => p.is_online) || [];
    const readyCount         = onlineParticipants.filter((p) => p.is_ready).length;
    const allReady           = readyCount === onlineParticipants.length && onlineParticipants.length > 0;

    const ps         = room.playback_state;
    const isRecovery =
      (ps?.status === "playing" || ps?.status === "paused") &&
      (ps?.current_time || 0) > 0;
    const wasPlaying    = ps?.status === "playing";
    const recoveryTime  = formatPlayerTime(ps?.current_time || 0);

    return (
      <section className="video-stage">
        <div className="video-stage-content">
          <div className="stage-icon"><IconFilm /></div>

          <h2>
            {isRecovery
              ? "Reselect your file to resume"
              : isController
              ? "Select your video file"
              : "Select your copy"}
          </h2>

          {/* Recovery banner — shown after refresh/reconnect during playback */}
          {isRecovery && (
            <div className="recovery-banner">
              <span className="recovery-icon">↺</span>
              <div className="recovery-text">
                <strong>Reconnected during playback</strong>
                <span>
                  {wasPlaying ? "Playing" : "Paused"} at {recoveryTime}
                  {" — "}reselect to resume
                </span>
              </div>
            </div>
          )}

          {hasHint && (
            <div className="file-hint">
              <span className="file-hint-name">{meta.filename}</span>
              <div className="file-hint-details">
                {meta.size     && <span>{formatBytes(meta.size)}</span>}
                {meta.duration && <span>{formatDuration(meta.duration)}</span>}
                {meta.mime_type && <span>{meta.mime_type}</span>}
              </div>
            </div>
          )}

          <p>
            {isRecovery
              ? "Your file is needed to restore your position."
              : hasHint
              ? "Find this file on your device and select it."
              : "Everyone loads the same file from their own device."}
          </p>

          {allReady ? (
            /* ── All ready → single Start Watching CTA ── */
            <label className={`start-watching-btn ${extractingMeta ? "file-select-btn-loading" : ""}`}>
              {extractingMeta ? "Loading…" : "▶ Start Watching"}
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={extractingMeta}
                style={{ display: "none" }}
              />
            </label>
          ) : (
            /* ── Not all ready → show file picker + ready panel ── */
            <>
              <label className={`file-select-btn ${extractingMeta ? "file-select-btn-loading" : ""}`}>
                <IconFilm />
                {extractingMeta ? "Reading file…" : isRecovery ? "Reselect File" : "Choose File"}
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={extractingMeta}
                  style={{ display: "none" }}
                />
              </label>

              <div className="ready-panel">
                {onlineParticipants.map((p) => (
                  <div key={p.participant_id} className="ready-row">
                    <span className={`ready-dot ${p.is_ready ? "ready-dot-yes" : "ready-dot-no"}`} />
                    <span className="ready-name">{p.display_name}</span>
                    <span className={`ready-label ${p.is_ready ? "ready-label-yes" : "ready-label-no"}`}>
                      {p.is_ready ? "Ready" : "Selecting…"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {localFileError && <p className="file-error">{localFileError}</p>}
        </div>
      </section>
    );
  }

  // Local video — file selected, player active
  if (contentType === "local_video" && localFile) {
    const onlineParticipants = room.participants?.filter((p) => p.is_online) || [];
    const readyCount = onlineParticipants.filter((p) => p.is_ready).length;
    const allReady   = readyCount === onlineParticipants.length && onlineParticipants.length > 0;

    return (
      <section className="video-stage video-stage-player">
        <LocalVideoPlayer
          videoRef={localVideoRef}
          isController={isController}
          ctrlPlaying={ctrlPlaying}
          ctrlTime={ctrlTime}
          ctrlDuration={ctrlDuration}
          ctrlVolume={ctrlVolume}
          ctrlMuted={ctrlMuted}
          ctrlRate={ctrlRate}
          ctrlFullscreen={ctrlFullscreen}
          isPiP={isPiP}
          scrubValue={scrubValue}
          isDraggingRef={isDraggingRef}
          viewerTime={viewerTime}
          viewerDuration={viewerDuration}
          room={room}
          controllerName={controllerName}
          onlineParticipants={onlineParticipants}
          readyCount={readyCount}
          allReady={allReady}
          localFile={localFile}
          onPlayPause={handlePlayPause}
          onSkip={handleSkip}
          onScrubPointerDown={() => { isDraggingRef.current = true; }}
          onScrubInput={handleScrubInput}
          onScrubEnd={handleScrubEnd}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onSpeedChange={handleSpeedChange}
          onFullscreenToggle={handleFullscreenToggle}
          onPiPToggle={handlePiPToggle}
          onMouseMove={handleShowControls}
          onMouseLeave={() => setShowControls(false)}
          showControls={showControls}
          onChangeFile={handleChangeFile}
        />
      </section>
    );
  }

  return null;
}

VideoStage.propTypes = {
  room: PropTypes.shape({
    room_code:                PropTypes.string.isRequired,
    invite_token:             PropTypes.string.isRequired,
    controller_participant_id: PropTypes.string,
    content_source: PropTypes.shape({
      type:     PropTypes.string,
      metadata: PropTypes.object,
    }),
    playback_state: PropTypes.shape({
      status:       PropTypes.string,
      current_time: PropTypes.number,
      playback_rate: PropTypes.number,
      updated_at:   PropTypes.string,
    }),
    participants: PropTypes.arrayOf(
      PropTypes.shape({
        participant_id: PropTypes.string,
        display_name:   PropTypes.string,
        is_online:      PropTypes.bool,
        is_ready:       PropTypes.bool,
      })
    ),
  }).isRequired,
  refreshRoom: PropTypes.func.isRequired,
};

export default VideoStage;
