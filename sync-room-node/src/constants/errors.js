/**
 * Standardized error codes — backend mirror of frontend/src/constants/errors.js.
 */

const ERROR = {
  ROOM_NOT_FOUND:         'ROOM_NOT_FOUND',
  NOT_CONTROLLER:         'NOT_CONTROLLER',
  NOT_HOST:               'NOT_HOST',
  PARTICIPANT_NOT_FOUND:  'PARTICIPANT_NOT_FOUND',
  INVALID_CONTENT_TYPE:   'INVALID_CONTENT_TYPE',
  INVALID_METADATA:       'INVALID_METADATA',
  INVALID_RATE:           'INVALID_RATE',
  ROOM_ALREADY_ENDED:     'ROOM_ALREADY_ENDED',
};

module.exports = { ERROR };
