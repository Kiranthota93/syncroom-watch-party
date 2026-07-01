import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import getClientId from "../utils/getClientId";

import nodeAPI from "../services/api";
import { createLogger } from "../utils/logger";
import { getPrefs } from "../hooks/usePreferences";

const log = createLogger("JoinRoom");

import "./JoinRoom.css";

function JoinRoom() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const invite_token =
    searchParams.get(
      "invite_token"
    );

  const [display_name,
    setDisplayName] =
    useState(() => getPrefs().displayName);

  const [room_code,
    setRoomCode] =
    useState("");

  const [loading,
    setLoading] =
    useState(true);

  const [joining,
    setJoining] =
    useState(false);

  const [error,
    setError] =
    useState("");

  const [showJoinForm,
    setShowJoinForm] =
    useState(false);


  useEffect(() => {
    validateInviteLink();
  }, []);

  const validateInviteLink =
    async () => {
      try {
        if (!invite_token) {
          setShowJoinForm(true);
          return;
        }

        const { data } =
          await nodeAPI.get(
            `/rooms/${invite_token}`
          );

        const room =
          data.room;

        const client_id =
          getClientId();

        const participant =
          room.participants?.find(
            (participant) =>
              participant.client_id ===
              client_id
          );

        if (participant) {
          localStorage.setItem(
            "syncroom_user",
            JSON.stringify({
              participant_id:
                participant.participant_id,

              client_id,

              display_name:
                participant.display_name,

              room_code:
                room.room_code,

              invite_token:
                room.invite_token,

              is_host:
                room.host_participant_id ===
                participant.participant_id,
            })
          );

          await nodeAPI.post(
            "/rooms/rejoin",
            {
              invite_token,
              client_id,
            }
          );

          navigate(
            `/room/${invite_token}`
          );

          return;
        }

        setShowJoinForm(true);
      } catch (error) {
        log.error("JoinRoom action failed", error);

        setError(
          "Invalid invite link"
        );
      } finally {
        setLoading(false);
      }
    };

  const joinRoom =
    async () => {
      setError("");

      if (
        !display_name.trim()
      ) {
        setError(
          "Please enter your name"
        );
        return;
      }

      if (
        !invite_token &&
        !room_code.trim()
      ) {
        setError(
          "Please enter room code"
        );
        return;
      }

      try {
        setJoining(true);

        const client_id =
          getClientId();

        const payload = {
          display_name:
            display_name.trim(),

          client_id,
        };

        if (invite_token) {
          payload.invite_token =
            invite_token;
        } else {
          payload.room_code =
            room_code
              .trim()
              .toUpperCase();
        }

        const { data } =
          await nodeAPI.post(
            "/rooms/join",
            payload
          );

        localStorage.setItem(
          "syncroom_user",
          JSON.stringify({
            participant_id:
              data.participant_id,

            client_id,

            display_name,

            room_code:
              data.room.room_code,

            invite_token:
              data.room.invite_token,

            is_host: false,
          })
        );

        navigate(
          `/room/${data.room.invite_token}`
        );
      } catch (error) {
        log.error("JoinRoom action failed", error);

        setError(
          error?.response?.data
            ?.message ||
            "Failed to join room"
        );
      } finally {
        setJoining(false);
      }
    };

  if (loading) {
    return (
      <div className="join-room-page">
        <h2>
          Checking invite...
        </h2>
      </div>
    );
  }

  return (
    <div className="join-room-page">
      <div className="join-room-header">
        <div className="logo">
          <div className="logo-icon">
            ▶
          </div>

          <span>SyncRoom</span>
        </div>

        <Link
          to="/"
          className="back-home-btn"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="join-room-content">
        <h1>
          Join a room
        </h1>

        <p>
          Enter your details
          to join the room.
        </p>

        {showJoinForm && (
          <div className="join-room-card">
            <label>
              DISPLAY NAME
            </label>

            <input
              type="text"
              placeholder="Enter your name"
              value={
                display_name
              }
              className={
                error
                  ? "input-error"
                  : ""
              }
              onChange={(e) => {
                setDisplayName(
                  e.target.value
                );

                setError("");
              }}
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  joinRoom();
                }
              }}
            />

            {!invite_token && (
              <>
                <label className="room-code-label">
                  ROOM CODE
                </label>

                <input
                  type="text"
                  placeholder="ABCD-EFGH"
                  className="room-code-input"
                  value={
                    room_code
                  }
                  onChange={(
                    e
                  ) =>
                    setRoomCode(
                      e.target.value.toUpperCase()
                    )
                  }
                />

                <small>
                  Enter the room
                  code shared by
                  the host.
                </small>
              </>
            )}

            {invite_token && (
              <small>
                Invite link
                verified.
              </small>
            )}

            {error && (
              <p className="error-text">
                {error}
              </p>
            )}

            <div className="card-footer">
              <Link
                to="/"
                className="secondary-btn"
              >
                ← Back to Home
              </Link>

              <button
                className="primary-btn"
                onClick={
                  joinRoom
                }
                disabled={
                  joining ||
                  !display_name.trim()
                }
              >
                {joining
                  ? "Joining..."
                  : "Join Room →"}
              </button>
            </div>
          </div>
        )}

        <div className="create-link">
          Do not have a room?

          <Link to="/create-room">
            Create a room
          </Link>
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;