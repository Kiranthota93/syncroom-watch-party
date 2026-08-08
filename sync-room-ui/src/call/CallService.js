import { SOCKET } from '../constants/events';
import { createLogger } from '../utils/logger';

const log = createLogger('CallService');

// One shared instance for both voice and video — a mesh peer connection to a
// given participant typically carries both audio and video tracks with
// independently toggleable enabled state, mirroring how PlaybackService is
// the single socket boundary regardless of YouTube vs local-video source.
//
// Note: uses a simple "joiner offers first" negotiation, not the full
// perfect-negotiation pattern — acceptable for a small mesh (~10 participants)
// but can glare if both sides add tracks at the exact same instant.
export class CallService {
  constructor({ socket, iceServers, inviteToken, getParticipantId }) {
    this.socket = socket;
    this.iceServers = iceServers;
    this.inviteToken = inviteToken;
    this.getParticipantId = getParticipantId;
    this.peers = new Map(); // participant_id -> RTCPeerConnection
    this.localStream = null;
    this.listeners = { remoteStream: new Set(), peerClosed: new Set() };
    this._bound = false;

    this._onPeers = this._onPeers.bind(this);
    this._onPeerJoined = this._onPeerJoined.bind(this);
    this._onPeerLeft = this._onPeerLeft.bind(this);
    this._onOffer = this._onOffer.bind(this);
    this._onAnswer = this._onAnswer.bind(this);
    this._onIceCandidate = this._onIceCandidate.bind(this);
  }

  on(event, cb) {
    this.listeners[event]?.add(cb);
    return () => this.listeners[event]?.delete(cb);
  }

  _emit(event, ...args) {
    this.listeners[event]?.forEach((cb) => {
      try { cb(...args); } catch (err) { log.error(`listener for ${event} threw`, err); }
    });
  }

  start() {
    if (this._bound) return;
    this._bound = true;
    this.socket.on(SOCKET.RTC_PEERS, this._onPeers);
    this.socket.on(SOCKET.RTC_PEER_JOINED, this._onPeerJoined);
    this.socket.on(SOCKET.RTC_PEER_LEFT, this._onPeerLeft);
    this.socket.on(SOCKET.RTC_OFFER, this._onOffer);
    this.socket.on(SOCKET.RTC_ANSWER, this._onAnswer);
    this.socket.on(SOCKET.RTC_ICE_CANDIDATE, this._onIceCandidate);
  }

  stop() {
    this._bound = false;
    this.socket.off(SOCKET.RTC_PEERS, this._onPeers);
    this.socket.off(SOCKET.RTC_PEER_JOINED, this._onPeerJoined);
    this.socket.off(SOCKET.RTC_PEER_LEFT, this._onPeerLeft);
    this.socket.off(SOCKET.RTC_OFFER, this._onOffer);
    this.socket.off(SOCKET.RTC_ANSWER, this._onAnswer);
    this.socket.off(SOCKET.RTC_ICE_CANDIDATE, this._onIceCandidate);
    Array.from(this.peers.keys()).forEach((id) => this._closePeer(id));
    this._stopLocalStream();
  }

  // Lazily requests only what's missing — never pre-warms mic/camera silently.
  async ensureLocalStream({ audio, video }) {
    const haveAudio = this.localStream?.getAudioTracks().length > 0;
    const haveVideo = this.localStream?.getVideoTracks().length > 0;
    const needAudio = audio && !haveAudio;
    const needVideo = video && !haveVideo;
    if (!needAudio && !needVideo) return this.localStream;

    const constraints = {};
    if (needAudio) constraints.audio = true;
    if (needVideo) constraints.video = true;

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (!this.localStream) {
      this.localStream = newStream;
    } else {
      newStream.getTracks().forEach((t) => this.localStream.addTrack(t));
    }

    newStream.getTracks().forEach((track) => {
      this.peers.forEach((pc) => pc.addTrack(track, this.localStream));
    });

    return this.localStream;
  }

  setMicEnabled(enabled) {
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
  }

  setCamEnabled(enabled) {
    this.localStream?.getVideoTracks().forEach((t) => { t.enabled = enabled; });
  }

  // Fully releases hardware (stops the track, not just disabling it) so the
  // browser's mic/camera-in-use indicator clears promptly.
  releaseTracks(kind) {
    if (!this.localStream) return;
    const tracks = kind === 'audio' ? this.localStream.getAudioTracks() : this.localStream.getVideoTracks();
    tracks.forEach((track) => {
      track.stop();
      this.localStream.removeTrack(track);
      this.peers.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track === track);
        if (sender) pc.removeTrack(sender);
      });
    });
  }

  hasAnyLocalTrack() {
    return (this.localStream?.getTracks().length || 0) > 0;
  }

  _stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  async _createPeerConnection(remoteParticipantId) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(remoteParticipantId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket.emit(SOCKET.RTC_ICE_CANDIDATE, {
          invite_token: this.inviteToken,
          to_participant_id: remoteParticipantId,
          from_participant_id: this.getParticipantId(),
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      this._emit('remoteStream', remoteParticipantId, e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      log.debug('connectionState changed', { remoteParticipantId, state: pc.connectionState });
      if (['closed', 'failed'].includes(pc.connectionState)) {
        this._closePeer(remoteParticipantId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      log.debug('iceConnectionState changed', { remoteParticipantId, state: pc.iceConnectionState });
    };

    // Single source of truth for offer creation — covers both the initial
    // connection (addTrack above triggers this once tracks exist) AND any
    // later renegotiation, e.g. turning the camera on after a voice-only
    // connection was already established. Without this, a track added to an
    // already-connected peer connection never gets announced to the peer.
    pc.onnegotiationneeded = async () => {
      if (pc.signalingState !== 'stable') return; // already negotiating — will re-fire once stable
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit(SOCKET.RTC_OFFER, {
          invite_token: this.inviteToken,
          to_participant_id: remoteParticipantId,
          from_participant_id: this.getParticipantId(),
          sdp: offer,
        });
      } catch (err) {
        log.error('Renegotiation failed', err);
      }
    };

    return pc;
  }

  async _onPeers({ peers }) {
    for (const p of peers) {
      try {
        // Creating the connection adds any existing local tracks, which
        // triggers onnegotiationneeded above to send the actual offer.
        await this._createPeerConnection(p.participant_id);
      } catch (err) {
        log.error('Failed to set up connection to peer', err);
      }
    }
  }

  _onPeerJoined() {
    // The new joiner initiates (see _onPeers) — we just wait for their offer.
  }

  async _onOffer({ from_participant_id, sdp }) {
    try {
      let pc = this.peers.get(from_participant_id);
      if (!pc) pc = await this._createPeerConnection(from_participant_id);
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit(SOCKET.RTC_ANSWER, {
        invite_token: this.inviteToken,
        to_participant_id: from_participant_id,
        from_participant_id: this.getParticipantId(),
        sdp: answer,
      });
    } catch (err) {
      log.error('Failed to answer offer', err);
    }
  }

  async _onAnswer({ from_participant_id, sdp }) {
    const pc = this.peers.get(from_participant_id);
    if (pc) {
      try { await pc.setRemoteDescription(sdp); } catch (err) { log.error('Failed to set remote answer', err); }
    }
  }

  async _onIceCandidate({ from_participant_id, candidate }) {
    const pc = this.peers.get(from_participant_id);
    if (pc && candidate) {
      try { await pc.addIceCandidate(candidate); } catch (err) { log.error('Failed to add ICE candidate', err); }
    }
  }

  _onPeerLeft({ participant_id }) {
    this._closePeer(participant_id);
  }

  _closePeer(id) {
    const pc = this.peers.get(id);
    if (pc) {
      pc.close();
      this.peers.delete(id);
      this._emit('peerClosed', id);
    }
  }
}
