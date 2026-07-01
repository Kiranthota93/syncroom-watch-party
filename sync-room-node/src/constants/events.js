/**
 * Centralized socket event name constants — backend mirror of frontend/src/constants/events.js.
 * Keep both files in sync when adding new events.
 */

const SOCKET = {
  JOIN_ROOM:          'join-room',
  PLAYBACK_PLAY:      'playback:play',
  PLAYBACK_PAUSE:     'playback:pause',
  PLAYBACK_SEEK:      'playback:seek',
  PLAYBACK_RATE:      'playback:rate',
  PLAYBACK_HEARTBEAT: 'playback:heartbeat',
  PLAYBACK_SYNC:      'playback:sync',
  ROOM_UPDATED:       'room:updated',
  ROOM_ENDED:         'room:ended',
  CHAT_MESSAGE:              'chat:message',
  CHAT_HISTORY:              'chat:history',
  CHAT_TYPING:               'chat:typing',
  CONTROLLER_REQUEST:        'controller:request',
  CONTROLLER_REQUEST_NOTIFY: 'controller:request:notify',
  PARTICIPANT_KICKED:        'participant:kicked',
  REACTION_SEND:             'reaction:send',
  REACTION_EMIT:             'reaction:emit',
};

module.exports = { SOCKET };
