import PropTypes from "prop-types";
import nodeAPI from "../../services/api";
import { createLogger } from "../../utils/logger";
import "./SourceSelector.css";

const log = createLogger("SourceSelector");

const IconYT = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.95C18.88 4 12 4 12 4s-6.88 0-8.59.47a2.78 2.78 0 0 0-1.95 1.95A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);

const IconFilm = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="2" width="20" height="20" rx="2"/>
    <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);

function SourceSelector({ room, refreshRoom }) {
  const current = room.content_source?.type;

  const selectSource = async (type) => {
    if (type === current) return;
    try {
      const user = JSON.parse(localStorage.getItem("syncroom_user") || "{}");
      await nodeAPI.post("/rooms/content", {
        room_code:      room.room_code,
        participant_id: user.participant_id,
        content_source: { type, metadata: {} },
      });
      refreshRoom();
    } catch (error) {
      log.error("Content source update failed", error);
    }
  };

  return (
    <div className="source-bar">
      <span className="source-bar-label">Source</span>
      <div className="source-bar-options">
        <button
          className={`source-opt ${current === "youtube" ? "source-opt-active" : ""}`}
          onClick={() => selectSource("youtube")}
        >
          <IconYT /> YouTube
          {current === "youtube" && <span className="source-check">✓</span>}
        </button>
        <button
          className={`source-opt ${current === "local_video" ? "source-opt-active" : ""}`}
          onClick={() => selectSource("local_video")}
        >
          <IconFilm /> Local Video
          {current === "local_video" && <span className="source-check">✓</span>}
        </button>
      </div>
    </div>
  );
}

SourceSelector.propTypes = {
  room: PropTypes.shape({
    room_code:      PropTypes.string.isRequired,
    content_source: PropTypes.shape({ type: PropTypes.string }),
  }).isRequired,
  refreshRoom: PropTypes.func.isRequired,
};

export default SourceSelector;
