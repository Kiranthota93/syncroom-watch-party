/**
 * Standardized error codes used across providers, validation, and the UI.
 *
 * Errors are codes not messages — display strings live in the component layer
 * so they can be localized or changed without touching business logic.
 */

export const ERROR = {
  // File validation
  FILE_HASH_MISMATCH:     'FILE_HASH_MISMATCH',
  FILE_SIZE_MISMATCH:     'FILE_SIZE_MISMATCH',
  FILE_DURATION_MISMATCH: 'FILE_DURATION_MISMATCH',
  FILE_TYPE_INVALID:      'FILE_TYPE_INVALID',
  FILE_NAME_MISMATCH:     'FILE_NAME_MISMATCH',

  // YouTube player
  YT_INVALID_PARAM:       'YT_INVALID_PARAM',
  YT_HTML5_ERROR:         'YT_HTML5_ERROR',
  YT_VIDEO_UNAVAILABLE:   'YT_VIDEO_UNAVAILABLE',
  YT_EMBED_DISABLED:      'YT_EMBED_DISABLED',
  YT_EMBED_DISABLED_ALT:  'YT_EMBED_DISABLED_ALT',

  // HTML5 video
  MEDIA_ABORTED:          'MEDIA_ABORTED',
  MEDIA_NETWORK:          'MEDIA_NETWORK',
  MEDIA_DECODE:           'MEDIA_DECODE',
  MEDIA_NOT_SUPPORTED:    'MEDIA_NOT_SUPPORTED',
  MEDIA_UNKNOWN:          'MEDIA_UNKNOWN',

  // Provider / engine
  PROVIDER_NOT_READY:     'PROVIDER_NOT_READY',
  PROVIDER_LOAD_FAILED:   'PROVIDER_LOAD_FAILED',
};

/** Human-readable messages keyed by error code. */
export const ERROR_MESSAGES = {
  [ERROR.FILE_HASH_MISMATCH]:     "File content doesn't match. Select the exact same file as the controller.",
  [ERROR.FILE_SIZE_MISMATCH]:     'File size mismatch — this is a different file.',
  [ERROR.FILE_DURATION_MISMATCH]: 'Duration mismatch — video lengths differ by more than 2 seconds.',
  [ERROR.FILE_TYPE_INVALID]:      'Please select a valid video file.',
  [ERROR.FILE_NAME_MISMATCH]:     "Filename doesn't match — may still be correct if renamed.",

  [ERROR.YT_INVALID_PARAM]:       'Invalid video URL — check the link and try again.',
  [ERROR.YT_HTML5_ERROR]:         'This video cannot be played in an embedded player.',
  [ERROR.YT_VIDEO_UNAVAILABLE]:   'This video is unavailable or has been removed.',
  [ERROR.YT_EMBED_DISABLED]:      'The video owner has disabled embedded playback.',
  [ERROR.YT_EMBED_DISABLED_ALT]:  'The video owner has disabled embedded playback.',

  [ERROR.MEDIA_ABORTED]:          'Playback aborted by the user.',
  [ERROR.MEDIA_NETWORK]:          'Network error during video load.',
  [ERROR.MEDIA_DECODE]:           'Video decoding failed — unsupported format or corrupt file.',
  [ERROR.MEDIA_NOT_SUPPORTED]:    'Video format not supported by this browser.',
  [ERROR.MEDIA_UNKNOWN]:          'Unknown video playback error.',
};

/** Maps YouTube IFrame error codes to ERROR constants. */
export const YOUTUBE_ERROR_MAP = {
  2:   ERROR.YT_INVALID_PARAM,
  5:   ERROR.YT_HTML5_ERROR,
  100: ERROR.YT_VIDEO_UNAVAILABLE,
  101: ERROR.YT_EMBED_DISABLED,
  150: ERROR.YT_EMBED_DISABLED_ALT,
};

/** Maps HTML5 MediaError codes to ERROR constants. */
export const HTML5_ERROR_MAP = {
  1: ERROR.MEDIA_ABORTED,
  2: ERROR.MEDIA_NETWORK,
  3: ERROR.MEDIA_DECODE,
  4: ERROR.MEDIA_NOT_SUPPORTED,
};
