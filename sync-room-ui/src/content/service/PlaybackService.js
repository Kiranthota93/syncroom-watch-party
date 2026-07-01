import socket from '../../socket/socket';
import { SOCKET, ENGINE_OUTBOUND } from '../../constants/events';
import { PLAYBACK }                from '../../constants/playback';

/**
 * PlaybackService — Socket.IO boundary between the network and PlaybackEngine.
 *
 * Responsibilities:
 *   - Register inbound socket event listeners and forward to engine.apply*()
 *   - Register engine outbound handlers and forward to socket.emit()
 *   - Manage the heartbeat interval
 *
 * The engine has zero knowledge of Socket.IO.
 * This service has zero knowledge of the player or UI.
 */
class PlaybackService {
  constructor({ engine, inviteToken, isController }) {
    this._engine          = engine;
    this._inviteToken     = inviteToken;
    this._isController    = isController;
    this._heartbeat       = null;
    this._socketListeners = {};
  }

  start() {
    this._registerOutboundHandlers();
    this._registerSocketListeners();
    this._startHeartbeat();
  }

  stop() {
    this._removeSocketListeners();
    this._stopHeartbeat();
  }

  updateIsController(value) {
    this._isController = value;
    this._engine.setIsController(value);
  }

  // ── Engine → Socket (outbound) ────────────────────────────────

  _registerOutboundHandlers() {
    this._engine.onOutbound(ENGINE_OUTBOUND.PLAY, ({ current_time }) => {
      socket.emit(SOCKET.PLAYBACK_PLAY, { invite_token: this._inviteToken, current_time });
    });

    this._engine.onOutbound(ENGINE_OUTBOUND.PAUSE, ({ current_time }) => {
      socket.emit(SOCKET.PLAYBACK_PAUSE, { invite_token: this._inviteToken, current_time });
    });

    this._engine.onOutbound(ENGINE_OUTBOUND.SEEK, ({ current_time }) => {
      socket.emit(SOCKET.PLAYBACK_SEEK, { invite_token: this._inviteToken, current_time });
    });

    this._engine.onOutbound(ENGINE_OUTBOUND.RATE, ({ playback_rate }) => {
      socket.emit(SOCKET.PLAYBACK_RATE, { invite_token: this._inviteToken, playback_rate });
    });
  }

  // ── Socket → Engine (inbound) ─────────────────────────────────

  _registerSocketListeners() {
    const onPlay  = ({ current_time })          => this._engine.applyPlay(current_time);
    const onPause = ({ current_time })          => this._engine.applyPause(current_time);
    const onSeek  = ({ current_time, status })  => this._engine.applySeek(current_time, status);
    const onRate  = ({ playback_rate })         => this._engine.applyRate(playback_rate);
    const onSync  = ({ current_time, status })  => this._engine.applySync(current_time, status);

    socket.on(SOCKET.PLAYBACK_PLAY,  onPlay);
    socket.on(SOCKET.PLAYBACK_PAUSE, onPause);
    socket.on(SOCKET.PLAYBACK_SEEK,  onSeek);
    socket.on(SOCKET.PLAYBACK_RATE,  onRate);
    socket.on(SOCKET.PLAYBACK_SYNC,  onSync);

    this._socketListeners = { onPlay, onPause, onSeek, onRate, onSync };
  }

  _removeSocketListeners() {
    const { onPlay, onPause, onSeek, onRate, onSync } = this._socketListeners;
    socket.off(SOCKET.PLAYBACK_PLAY,  onPlay);
    socket.off(SOCKET.PLAYBACK_PAUSE, onPause);
    socket.off(SOCKET.PLAYBACK_SEEK,  onSeek);
    socket.off(SOCKET.PLAYBACK_RATE,  onRate);
    socket.off(SOCKET.PLAYBACK_SYNC,  onSync);
    this._socketListeners = {};
  }

  // ── Heartbeat ─────────────────────────────────────────────────

  _startHeartbeat() {
    this._heartbeat = setInterval(() => {
      const { currentTime, isPlaying, seekInProgress } = this._engine.getSnapshot();

      if (!isPlaying) return;

      // Skip while a user-initiated seek is in flight.
      // The server's playback_state.current_time has not yet been updated to
      // the new seek position. Sending a heartbeat now causes the server to
      // compute drift against the stale pre-seek value and issue a playback:sync
      // that snaps the player back to the wrong timestamp.
      if (seekInProgress) return;

      socket.emit(SOCKET.PLAYBACK_HEARTBEAT, {
        invite_token: this._inviteToken,
        current_time: currentTime,
      });
    }, PLAYBACK.HEARTBEAT_INTERVAL_MS);
  }

  _stopHeartbeat() {
    clearInterval(this._heartbeat);
    this._heartbeat = null;
  }
}

export default PlaybackService;
