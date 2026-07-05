import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import nodeAPI from "../services/api";
import getClientId from "../utils/getClientId";
import Skeleton from "./Skeleton/Skeleton";
import "./WatchHistory.css";

const fmtDuration = (s) => {
  if (!s || s < 60) return "< 1 min";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffM  = Math.floor(diffMs / 60000);
  const diffH  = Math.floor(diffM / 60);
  const diffD  = Math.floor(diffH / 24);

  if (diffM < 1)  return "just now";
  if (diffM < 60) return `${diffM} min ago`;
  if (diffH < 24) return `${diffH} hr ago`;
  if (diffD < 7)  return `${diffD} day${diffD > 1 ? "s" : ""} ago`;

  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ContentIcon = ({ type }) => {
  if (type === "youtube") {
    return (
      <svg className="wh-icon wh-icon-yt" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.03 0 12 0 12s0 3.97.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.45 20.5 12 20.5 12 20.5s7.55 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.97 24 12 24 12s0-3.97-.5-5.81zM9.75 15.52V8.48L15.5 12l-5.75 3.52z"/>
      </svg>
    );
  }
  if (type === "local_video") {
    return (
      <svg className="wh-icon wh-icon-local" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    );
  }
  return (
    <svg className="wh-icon wh-icon-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
};

ContentIcon.propTypes = {
  type: PropTypes.string,
};

function WatchHistory() {
  const [sessions, setSessions]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [expanded, setExpanded]   = useState(false);

  useEffect(() => {
    const client_id = getClientId();
    nodeAPI
      .get(`/rooms/watch-history?client_id=${encodeURIComponent(client_id)}`)
      .then(({ data }) => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="wh-section">
        <div className="wh-header">
          <Skeleton width={130} height={18} />
        </div>
        <div className="wh-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="wh-card">
              <Skeleton width={40} height={40} radius={10} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton width="55%" height={13} />
                <Skeleton width="38%" height={10} />
              </div>
              <Skeleton width={56} height={22} radius={6} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <section className="wh-section">
      <button
        type="button"
        className="wh-header wh-header-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <h2 className="wh-title">Watch History</h2>
        <span className="wh-count">{sessions.length}</span>
        <svg
          className={`wh-chevron ${expanded ? "wh-chevron-open" : ""}`}
          viewBox="0 0 24 24" width="16" height="16"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
      <div className="wh-list">
        {sessions.map((s) => (
          <div key={s._id} className="wh-card">
            <div className={`wh-icon-wrap wh-icon-wrap-${s.content_type || "none"}`}>
              <ContentIcon type={s.content_type} />
            </div>

            <div className="wh-info">
              <div className="wh-content-title">
                {s.content_title
                  ? (s.content_url
                      ? <a href={s.content_url} target="_blank" rel="noopener noreferrer">{s.content_title}</a>
                      : s.content_title)
                  : <span className="wh-no-content">No content selected</span>}
              </div>
              <div className="wh-meta">
                <span className="wh-room">{s.room_name}</span>
                <span className="wh-sep">·</span>
                <span className="wh-time">{fmtDate(s.ended_at)}</span>
              </div>
            </div>

            <div className="wh-right">
              <span className="wh-duration">{fmtDuration(s.duration_s)}</span>
              {s.participant_count > 1 && (
                <span className="wh-participants">
                  👥 {s.participant_count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}

export default WatchHistory;
