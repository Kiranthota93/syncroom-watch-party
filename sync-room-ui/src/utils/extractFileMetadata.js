/**
 * extractFileMetadata — reads metadata from a local video File object.
 *
 * Returns:
 *   filename   — original file name
 *   extension  — lowercase extension (mp4, webm, mkv …)
 *   mime_type  — MIME type from the File, or derived from extension
 *   size       — file size in bytes
 *   duration   — video duration in seconds (loaded via a temp <video> element)
 *   sha256     — hex fingerprint of the first 1 MB (fast, sufficient for validation)
 */
const extractFileMetadata = async (file) => {
  const filename  = file.name;
  const extension = filename.includes(".")
    ? filename.split(".").pop().toLowerCase()
    : "";
  const mime_type = file.type || `video/${extension}`;
  const size      = file.size;

  const [duration, sha256] = await Promise.all([
    getVideoDuration(file),
    computePartialHash(file),
  ]);

  return { filename, extension, mime_type, size, duration, sha256 };
};

// ── Helpers ───────────────────────────────────────────────────────

/** Load the file into a temporary <video> element to read its duration. */
const getVideoDuration = (file) =>
  new Promise((resolve) => {
    const url   = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(video.duration) ? video.duration : 0);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };

    video.src = url;
  });

/** SHA-256 of the first 1 MB — fast enough to not block UX. */
const computePartialHash = async (file) => {
  try {
    const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB
    const chunk      = file.slice(0, CHUNK_SIZE);
    const buffer     = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
};

export default extractFileMetadata;
