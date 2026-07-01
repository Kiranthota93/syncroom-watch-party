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
