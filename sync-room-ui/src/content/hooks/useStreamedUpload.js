import { useEffect, useRef, useState, useCallback } from "react";
import nodeAPI from "../../services/api";
import socket from "../../socket/socket";
import { SOCKET } from "../../constants/events";
import { createLogger } from "../../utils/logger";

const log = createLogger("useStreamedUpload");

const CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Drives the chunked streamed-video upload. Lives above VideoStage (in Room)
 * so the "start/replace streamed video" trigger is reachable from the header's
 * content-source menu at any time — not just from VideoStage's empty state,
 * which was the only entry point before and made the source unreachable again
 * once you'd switched away from it.
 */
export function useStreamedUpload({ inviteToken, participantId, refreshRoom }) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState("");
  const inFlightRef = useRef(false);

  useEffect(() => {
    const onProgress = ({ chunk_index, total_chunks }) => {
      setProgress(Math.round(((chunk_index + 1) / total_chunks) * 100));
    };
    socket.on(SOCKET.CONTENT_UPLOAD_PROGRESS, onProgress);
    return () => socket.off(SOCKET.CONTENT_UPLOAD_PROGRESS, onProgress);
  }, []);

  const upload = useCallback(async (file) => {
    if (!file || inFlightRef.current) return;
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    inFlightRef.current = true;
    setError("");
    setUploading(true);
    setProgress(0);

    try {
      const total_chunks = Math.ceil(file.size / CHUNK_SIZE);

      const { data } = await nodeAPI.post(`/rooms/${inviteToken}/video/upload-init`, {
        participant_id: participantId,
        original_name:  file.name,
        mime_type:      file.type,
        size_bytes:     file.size,
        total_chunks,
      });
      refreshRoom();

      for (let i = 0; i < total_chunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const form = new FormData();
        form.append("upload_id",      data.upload_id);
        form.append("chunk_index",    i);
        form.append("total_chunks",   total_chunks);
        form.append("participant_id", participantId);
        form.append("chunk", chunk);

        await nodeAPI.post(`/rooms/${inviteToken}/video/upload-chunk`, form);
        setProgress(Math.round(((i + 1) / total_chunks) * 100));
      }

      refreshRoom();
    } catch (err) {
      log.error("Streamed video upload failed", err);
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      inFlightRef.current = false;
    }
  }, [inviteToken, participantId, refreshRoom]);

  const clearError = useCallback(() => setError(""), []);

  return { uploading, progress, error, upload, clearError };
}
