import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import nodeAPI from "../services/api";
import { createLogger } from "../utils/logger";
import "./Hero.css";

const log = createLogger("Hero");

function Hero() {
  const navigate = useNavigate();

  const [room_code, setRoomCode]     = useState("");
  const [loading, setLoading]        = useState(false);
  const [joinError, setJoinError]    = useState("");
  const [activeRooms, setActiveRooms] = useState(null);
  const [rejoinRoom, setRejoinRoom]  = useState(null);
  const [showRejoin, setShowRejoin]  = useState(true);

  // Live room count
  useEffect(() => {
    nodeAPI.get("/rooms/stats")
      .then(({ data }) => setActiveRooms(data.activeRooms))
      .catch(() => {});
  }, []);

  // Rejoin detection — check localStorage for a recent room
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("syncroom_user") || "{}");
    if (!user?.invite_token) return;
    // Verify the room still exists and is active
    nodeAPI.get(`/rooms/${user.invite_token}`)
      .then(({ data }) => {
        if (data.room?.status === "active") {
          setRejoinRoom({ ...data.room, participant_id: user.participant_id });
        }
      })
      .catch(() => localStorage.removeItem("syncroom_user"));
  }, []);

  const verifyRoom = async () => {
    if (!room_code.trim()) return;
    try {
      setLoading(true);
      const { data } = await nodeAPI.post("/rooms/by-code", { room_code: room_code.trim().toUpperCase() });
      navigate(`/join-room?invite_token=${data.room?.invite_token || ""}`);
    } catch (error) {
      log.error("Quick join failed", error);
      setJoinError(error?.response?.data?.message || "Room not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismissRejoin = () => {
    setShowRejoin(false);
    localStorage.removeItem("syncroom_user");
  };

  return (
    <section className="hero">

      {/* Rejoin banner */}
      {rejoinRoom && showRejoin && (
        <div className="rejoin-banner">
          <span className="rejoin-icon">🎬</span>
          <div className="rejoin-text">
            <strong>{rejoinRoom.room_name}</strong>
            <span>· {rejoinRoom.room_code} · This room is still active</span>
          </div>
          <div className="rejoin-actions">
            <Link
              to={`/room/${rejoinRoom.invite_token}`}
              className="rejoin-btn"
            >
              Rejoin
            </Link>
            <button className="rejoin-dismiss" onClick={handleDismissRejoin}>✕</button>
          </div>
        </div>
      )}

      {/* Live badge */}
      <div className="live-badge">
        <span className="live-dot" />
        Live · Synced playback in real time
        {activeRooms !== null && (
          <span className="live-rooms">· {activeRooms} {activeRooms === 1 ? "room" : "rooms"} active</span>
        )}
      </div>

      <h1>
        Watch Together.<br />
        <span>Anywhere.</span>
      </h1>

      <p>
        Watch <strong>YouTube videos</strong> or <strong>local video files</strong> together
        in perfect sync. Create a private room, share a code,
        and everyone stays synchronized — automatically.
        No accounts, no downloads.
      </p>

      <div className="hero-actions">
        <Link to="/create-room" className="create-btn">
          Create room
        </Link>

        <div className="join-input-wrap">
          <input
            placeholder="ENTER CODE"
            value={room_code}
            onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setJoinError(""); }}
            onKeyDown={(e) => e.key === "Enter" && verifyRoom()}
            maxLength={9}
          />
          <button
            className="join-btn"
            onClick={verifyRoom}
            disabled={loading || !room_code.trim()}
          >
            {loading ? "Checking…" : "Join"}
          </button>
        </div>
        {joinError && <p className="hero-join-error">{joinError}</p>}
      </div>
    </section>
  );
}

export default Hero;
