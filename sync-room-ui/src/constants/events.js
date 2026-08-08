/**
 * Centralized socket and provider event name constants.
 *
 * All socket.emit / socket.on calls must reference these constants.
 * Never use raw string literals for event names in application code.
 */

/** Socket.IO events — used by PlaybackService and Room.jsx */
export const SOCKET = {
  JOIN_ROOM:          'join-room',
  PLAYBACK_PLAY:      'playback:play',
  PLAYBACK_PAUSE:     'playback:pause',
  PLAYBACK_SEEK:      'playback:seek',
  PLAYBACK_RATE:      'playback:rate',
  PLAYBACK_HEARTBEAT: 'playback:heartbeat',
  PLAYBACK_SYNC:      'playback:sync',
  ROOM_UPDATED:       'room:updated',
  ROOM_ENDED:         'room:ended',
  CHAT_MESSAGE:            'chat:message',
  CHAT_HISTORY:            'chat:history',
  CHAT_TYPING:             'chat:typing',
  CONTROLLER_REQUEST:      'controller:request',
  CONTROLLER_REQUEST_NOTIFY: 'controller:request:notify',
  PARTICIPANT_KICKED:        'participant:kicked',
  REACTION_SEND:             'reaction:send',
  REACTION_EMIT:             'reaction:emit',

  // Ping — ephemeral attention-getter, no persistence
  PARTICIPANT_PING:        'participant:ping',
  PARTICIPANT_PING_NOTIFY: 'participant:ping:notify',

  // Voice call
  VOICE_JOIN:         'voice:join',
  VOICE_LEAVE:        'voice:leave',
  VOICE_TOGGLE_MIC:   'voice:toggle-mic',
  VOICE_MIC_REJECTED: 'voice:mic-rejected',   // server -> sender only, toggle was refused
  VOICE_SPEAKING:     'voice:speaking',       // ephemeral relay, no persistence

  // Video call
  VIDEO_JOIN:         'video:join',
  VIDEO_LEAVE:        'video:leave',
  VIDEO_TOGGLE_CAM:   'video:toggle-cam',
  VIDEO_CAM_REJECTED: 'video:cam-rejected',  // server -> sender only, toggle was refused

  // WebRTC signaling relay (mesh) — server never inspects these payloads
  RTC_PEERS:          'rtc:peers',
  RTC_PEER_JOINED:    'rtc:peer-joined',
  RTC_PEER_LEFT:      'rtc:peer-left',
  RTC_OFFER:          'rtc:offer',
  RTC_ANSWER:         'rtc:answer',
  RTC_ICE_CANDIDATE:  'rtc:ice-candidate',

  // Watch/Social mode
  PLAYBACK_PAUSE_REQUEST:        'playback:pause-request',
  PLAYBACK_PAUSE_REQUEST_NOTIFY: 'playback:pause-request:notify',

  // Streamed local video upload — ephemeral per-chunk progress, no persistence
  CONTENT_UPLOAD_PROGRESS: 'content:upload-progress',
};

/** MediaProvider internal event names — used by providers and PlaybackEngine */
export const PROVIDER = {
  READY:          'ready',
  PLAY:           'play',
  PAUSE:          'pause',
  STATECHANGE:    'statechange',
  RATECHANGE:     'ratechange',
  ENDED:          'ended',
  ERROR:          'error',
  DURATIONCHANGE: 'durationchange',
};

/** PlaybackEngine outbound event names — used by PlaybackService handlers */
export const ENGINE_OUTBOUND = {
  PLAY:  'play',
  PAUSE: 'pause',
  SEEK:  'seek',
  RATE:  'rate',
};
