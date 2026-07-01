import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import nodeAPI from "../services/api";
import getClientId from "../utils/getClientId";
import Skeleton from "./Skeleton/Skeleton";
import "./MyRooms.css";

function timeSince(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1)  return "just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MyRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client_id = getClientId();
    nodeAPI.get(`/rooms/my-rooms?client_id=${client_id}`)
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRejoin = async (room) => {
    // Verify the room is still active before trusting the cached data.
    // If it was ended between the time MyRooms loaded and now, we should
    // remove it from the list rather than navigating to a dead room.
    try {
      const { data } = await nodeAPI.get(`/rooms/${room.invite_token}`);
      if (data.room?.status !== "active") {
        // Room ended — quietly drop it from the list
        setRooms((prev) => prev.filter((r) => r.invite_token !== room.invite_token));
        return;
      }
    } catch {
      // Room not found (404) — ended or expired
      setRooms((prev) => prev.filter((r) => r.invite_token !== room.invite_token));
      return;
    }

    // Room is confirmed active. Restore correct identity for this room before
    // navigating so Room.jsx recognises the user as host/participant.
    const client_id = getClientId();
    localStorage.setItem("syncroom_user", JSON.stringify({
      participant_id: room.participant_id,
      client_id,
      display_name:   room.display_name || "",
      room_code:      room.room_code,
      invite_token:   room.invite_token,
      is_host:        room.is_host,
    }));
    navigate(`/room/${room.invite_token}`);
  };

  if (loading) {
    return (
      <section className="my-rooms">
        <div className="my-rooms-header">
          <Skeleton width={140} height={18} />
        </div>
        <div className="my-rooms-grid">
          {[1, 2].map((i) => (
            <div key={i} className="my-room-card">
              <div className="my-room-top">
                <Skeleton width="55%" height={16} />
                <Skeleton width={60}  height={20} radius={99} />
              </div>
              <Skeleton width="40%" height={13} />
              <Skeleton width="70%" height={11} />
              <Skeleton width="100%" height={34} radius={10} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (rooms.length === 0) return null;

  return (
    <section className="my-rooms">
      <div className="my-rooms-header">
        <h2>Your Active Rooms</h2>
        <span className="my-rooms-count">{rooms.length}</span>
      </div>

      <div className="my-rooms-grid">
        {rooms.map((room) => (
          <div key={room.invite_token} className="my-room-card">
            <div className="my-room-top">
              <div className="my-room-name">{room.room_name}</div>
              <div className="my-room-badges">
                {room.is_host && <span className="room-badge badge-host">👑 Host</span>}
                <span className="room-badge badge-online">
                  <span className="online-dot" />{room.online_count} online
                </span>
              </div>
            </div>

            <div className="my-room-code">{room.room_code}</div>
            <div className="my-room-meta">
              {room.is_host ? "Created by you" : `Host: ${room.host_name}`}
              {" · "}
              {timeSince(room.created_at)}
            </div>

            <button
              className="my-room-join"
              onClick={() => handleRejoin(room)}
            >
              Rejoin room →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MyRooms;
