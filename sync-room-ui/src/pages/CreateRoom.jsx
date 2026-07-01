import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import getClientId from "../utils/getClientId";
import nodeAPI from "../services/api";
import { createLogger } from "../utils/logger";
import { getPrefs } from "../hooks/usePreferences";

const log = createLogger("CreateRoom");

import "./CreateRoom.css";

function CreateRoom() {
  const navigate = useNavigate();

  const [display_name, setDisplayName] = useState(() => getPrefs().displayName);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const createRoom = async () => {
    if (!display_name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError("");
    try {
      setLoading(true);
      const client_id = getClientId();
      const { data } = await nodeAPI.post("/rooms/create", { display_name, client_id });

      const room = data.room;
      localStorage.setItem("syncroom_user", JSON.stringify({
        participant_id: data.participant_id,
        display_name,
        client_id,
        room_code:    room.room_code,
        invite_token: room.invite_token,
        is_host:      true,
      }));

      navigate(`/room/${room.invite_token}`);
    } catch (err) {
      log.error("Create room failed", err);
      setError(err?.response?.data?.message || "Failed to create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-page">
      <div className="create-room-header">
        <div className="logo">
          <div className="logo-icon">▶</div>
          <span>SyncRoom</span>
        </div>
        <Link to="/" className="back-home-btn">← Back to Home</Link>
      </div>

      <div className="create-room-content">
        <h1>Create a room</h1>
        <p>Spin up a private room and invite friends. You will pick what to watch once you are in.</p>

        <div className="create-room-card">
          <label>DISPLAY NAME</label>

          <input
            type="text"
            value={display_name}
            placeholder="Enter your name"
            className={error ? "input-error" : ""}
            onChange={(e) => { setDisplayName(e.target.value.toLocaleUpperCase()); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") createRoom(); }}
          />

          {error && <p className="error-text">{error}</p>}

          <small>Visible to everyone in the room.</small>

          <div className="card-footer">
            <Link to="/" className="secondary-btn">← Back to Home</Link>
            <button
              className="primary-btn"
              onClick={createRoom}
              disabled={loading || !display_name.trim()}
            >
              {loading ? "Creating..." : "Create Room →"}
            </button>
          </div>
        </div>

        <div className="join-link">
          Got a code?{" "}
          <Link to="/join-room">Join a room</Link>
        </div>
      </div>
    </div>
  );
}

export default CreateRoom;
