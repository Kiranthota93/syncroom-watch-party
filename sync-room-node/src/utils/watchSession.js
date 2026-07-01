const WatchSession = require("../models/watchSessionModel");
const { createLogger } = require("./logger");

const log = createLogger("watchSession");

/**
 * Record a watch session for a single participant leaving a room.
 * Non-critical — errors are swallowed so they never block the main operation.
 */
const recordWatchSession = async (room, participant) => {
  if (!participant?.client_id) return;

  try {
    const ended_at   = new Date();
    const started_at = participant.joined_at
      ? new Date(participant.joined_at)
      : ended_at;
    const duration_s = Math.max(0, Math.round((ended_at - started_at) / 1000));

    const content = room.content_source;
    let content_type  = null;
    let content_title = null;
    let content_url   = null;

    if (content?.type === "youtube") {
      content_type  = "youtube";
      content_title = content.metadata?.title || null;
      content_url   = content.metadata?.video_id
        ? `https://www.youtube.com/watch?v=${content.metadata.video_id}`
        : null;
    } else if (content?.type === "local_video") {
      content_type  = "local_video";
      content_title = content.metadata?.filename || null;
    }

    const online_count = (room.participants || []).filter((p) => p.is_online).length;

    await WatchSession.create({
      client_id:        participant.client_id,
      display_name:     participant.display_name,
      invite_token:     room.invite_token,
      room_name:        room.room_name,
      content_type,
      content_title,
      content_url,
      started_at,
      ended_at,
      duration_s,
      participant_count: online_count,
    });

    log.info("Watch session recorded", {
      client_id: participant.client_id,
      duration_s,
    });
  } catch (err) {
    log.error("Failed to record watch session", { error: err.message });
  }
};

module.exports = { recordWatchSession };
