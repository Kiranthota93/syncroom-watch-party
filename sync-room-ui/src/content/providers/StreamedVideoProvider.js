import LocalVideoProvider from './LocalVideoProvider';

/**
 * StreamedVideoProvider — the new "host uploads once, everyone streams from
 * the server" source. Reuses every bit of LocalVideoProvider's HTML5 <video>
 * event handling (play/pause/seek detection is identical) and only overrides
 * how the element gets its source: a server-streamed HTTP URL (with Range
 * request support) instead of a local File turned into a blob: URL.
 *
 * Kept as a separate, parallel provider — the existing "local_video" (each
 * participant loads their own copy) path is untouched.
 */
class StreamedVideoProvider extends LocalVideoProvider {
  attachElement(videoEl, url) {
    if (this._el) this._detachListeners();

    this._el   = videoEl;
    this._file = null;

    videoEl.src     = url;
    videoEl.preload = 'auto';

    this._attachListeners();
  }

  // No blob URL was created — nothing to revoke, unlike LocalVideoProvider.
  destroy() {
    this._blobUrl = null;
    super.destroy();
  }
}

export default StreamedVideoProvider;
