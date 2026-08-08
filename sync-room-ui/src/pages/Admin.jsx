import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";

import nodeAPI from "../services/api";
import { createLogger } from "../utils/logger";

import "./Admin.css";

const log = createLogger("Admin");

// sessionStorage, not localStorage: the passkey is cleared when the tab closes
// rather than persisting on disk indefinitely.
const KEY_STORAGE = "syncroom_admin_key";

const fmtBytes = (bytes) => {
  if (!bytes) return "—";
  const G = 1024 ** 3, M = 1024 ** 2, K = 1024;
  if (bytes >= G) return `${(bytes / G).toFixed(2)} GB`;
  if (bytes >= M) return `${(bytes / M).toFixed(1)} MB`;
  if (bytes >= K) return `${(bytes / K).toFixed(0)} KB`;
  return `${bytes} B`;
};

const fmtAgo = (iso) => {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtDuration = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
};

export default function Admin() {
  const [passkey, setPasskey]   = useState(() => sessionStorage.getItem(KEY_STORAGE) || "");
  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState("");

  const [stats, setStats]   = useState(null);
  const [rooms, setRooms]   = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [busyToken, setBusyToken] = useState(null);
  const [confirming, setConfirming] = useState(null); // { token, code, scope }
  const [notice, setNotice] = useState(null);

  const [bulkConfirming, setBulkConfirming] = useState(null); // { category, label, count }
  const [bulkTyped, setBulkTyped] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const authHeader = useCallback(
    (key = passkey) => ({ headers: { "x-admin-key": key } }),
    [passkey]
  );

  const flash = (message, type = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const loadData = useCallback(async (key = passkey) => {
    setLoading(true);
    try {
      const [statsRes, roomsRes] = await Promise.all([
        nodeAPI.get("/admin/stats", { headers: { "x-admin-key": key } }),
        nodeAPI.get("/admin/rooms", {
          headers: { "x-admin-key": key },
          params: { status: filter, q: query || undefined, limit: 200 },
        }),
      ]);
      setStats(statsRes.data.stats);
      setRooms(roomsRes.data.rooms);
    } catch (err) {
      if (err?.response?.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem(KEY_STORAGE);
        setAuthError("Session rejected — re-enter the passkey.");
      } else {
        log.error("Failed to load admin data", err);
        flash(err?.response?.data?.message || "Failed to load data", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [passkey, filter, query]);

  const submitKey = async (e) => {
    e?.preventDefault();
    if (!passkey.trim()) return;
    setChecking(true);
    setAuthError("");
    try {
      await nodeAPI.get("/admin/verify", authHeader(passkey.trim()));
      sessionStorage.setItem(KEY_STORAGE, passkey.trim());
      setAuthed(true);
      await loadData(passkey.trim());
    } catch (err) {
      const status = err?.response?.status;
      setAuthError(
        status === 429 ? (err.response.data?.message || "Too many attempts. Try again later.")
        : status === 503 ? "Admin API is not configured on this server."
        : "Invalid passkey."
      );
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  };

  // Re-verify a stored key on mount so a stale one doesn't render an empty shell.
  useEffect(() => {
    const stored = sessionStorage.getItem(KEY_STORAGE);
    if (!stored) return;
    (async () => {
      try {
        await nodeAPI.get("/admin/verify", { headers: { "x-admin-key": stored } });
        setAuthed(true);
        loadData(stored);
      } catch {
        sessionStorage.removeItem(KEY_STORAGE);
        setPasskey("");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authed) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, authed]);

  const doDelete = async () => {
    if (!confirming) return;
    const { token, scope, code } = confirming;
    setConfirming(null);
    setBusyToken(token);
    try {
      if (scope === "room") {
        await nodeAPI.delete(`/admin/rooms/${token}`, authHeader());
        flash(`Deleted room ${code} and its content`);
      } else {
        await nodeAPI.delete(`/admin/rooms/${token}/content`, authHeader());
        flash(`Cleared content for ${code}`);
      }
      await loadData();
    } catch (err) {
      flash(err?.response?.data?.message || "Delete failed", "error");
    } finally {
      setBusyToken(null);
    }
  };

  const openBulkConfirm = (category, label, count) => {
    if (!count) return;
    setBulkTyped("");
    setBulkConfirming({ category, label, count });
  };

  const doBulkDelete = async () => {
    if (!bulkConfirming) return;
    const { category, label, count } = bulkConfirming;
    setBulkBusy(true);
    try {
      const { data } = await nodeAPI.post(
        "/admin/rooms/bulk-delete",
        { category, expected_count: count },
        authHeader()
      );
      setBulkConfirming(null);
      flash(
        data.failed_count
          ? `Deleted ${data.deleted_count} ${label} rooms — ${data.failed_count} failed, see server log`
          : `Deleted ${data.deleted_count} ${label} rooms`
      );
      await loadData();
    } catch (err) {
      // 409 = the count changed between opening the dialog and confirming
      // (another admin acted, or the lifecycle sweep ran) — the backend
      // refuses rather than deleting a different set than what was shown.
      if (err?.response?.status === 409) {
        flash(err.response.data?.message || "Room count changed — refresh and try again", "error");
        setBulkConfirming(null);
        await loadData();
      } else {
        flash(err?.response?.data?.message || "Bulk delete failed", "error");
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const runCleanup = async () => {
    setLoading(true);
    try {
      const { data } = await nodeAPI.post("/admin/cleanup", {}, authHeader());
      const r = data.result || {};
      flash(
        data.dryRun
          ? `Dry run — would expire ${r.expired}, purge ${r.purged}, remove ${r.orphans} orphan dirs`
          : `Expired ${r.expired}, purged ${r.purged}, removed ${r.orphans} orphan dirs`
      );
      await loadData();
    } catch (err) {
      flash(err?.response?.data?.message || "Cleanup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem(KEY_STORAGE);
    setPasskey("");
    setAuthed(false);
    setStats(null);
    setRooms([]);
  };

  // ── Gate ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="admin-gate">
        <form className="admin-gate-card" onSubmit={submitKey}>
          <div className="admin-gate-icon">🔐</div>
          <h1>Admin access</h1>
          <p>Enter the administrator passkey to continue.</p>

          <input
            type="password"
            className={`admin-input ${authError ? "admin-input-error" : ""}`}
            placeholder="Passkey"
            value={passkey}
            onChange={(e) => { setPasskey(e.target.value); setAuthError(""); }}
            autoFocus
            autoComplete="current-password"
          />

          {authError && <p className="admin-gate-error">{authError}</p>}

          <button className="admin-btn admin-btn-primary" type="submit" disabled={checking || !passkey.trim()}>
            {checking ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  const s = stats?.rooms;
  const cleanup = stats?.cleanup;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>SyncRoom Admin</h1>
          {cleanup?.dryRun && (
            <span className="admin-badge admin-badge-warn" title="Set ROOM_CLEANUP_DRY_RUN=false to enable automatic deletion">
              Cleanup dry-run
            </span>
          )}
        </div>
        <div className="admin-header-actions">
          <button className="admin-btn" onClick={() => loadData()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="admin-btn" onClick={runCleanup} disabled={loading}>
            Run cleanup
          </button>
          <button className="admin-btn admin-btn-ghost" onClick={signOut}>Lock</button>
        </div>
      </header>

      {notice && (
        <div className={`admin-notice admin-notice-${notice.type}`}>{notice.message}</div>
      )}

      <section className="admin-stats">
        <Stat label="Total rooms" value={s?.total ?? "—"} />
        <Stat label="Active" value={s?.active ?? "—"} tone="ok" />
        <Stat label="Occupied" value={s?.occupied ?? "—"} tone="ok" />
        <Stat label="Empty (active)" value={s?.empty ?? "—"} tone="warn" />
        <Stat label="Expired" value={s?.expired ?? "—"} tone="dim" />
        <Stat label="Ended" value={s?.ended ?? "—"} tone="dim" />
        <Stat label="Playing now" value={stats?.playback?.playing ?? "—"} tone="accent" />
        <Stat label="Upload storage" value={fmtBytes(stats?.storage?.uploadsBytes)} tone="accent"
              sub={`${stats?.storage?.uploadDirs ?? 0} dirs`} />
      </section>

      {cleanup && (
        <p className="admin-policy">
          Auto-cleanup: empty rooms expire after <strong>{fmtDuration(cleanup.emptyGraceMs)}</strong>,
          idle rooms after <strong>{fmtDuration(cleanup.maxIdleMs)}</strong>,
          deleted <strong>{fmtDuration(cleanup.retentionMs)}</strong> after expiry.
        </p>
      )}

      <section className="admin-bulk">
        <span className="admin-bulk-label">Delete by status:</span>
        <button
          className="admin-btn admin-btn-sm admin-btn-danger"
          disabled={!s?.empty || bulkBusy}
          onClick={() => openBulkConfirm("active_empty", "empty active", s?.empty)}
        >
          Empty active rooms ({s?.empty ?? 0})
        </button>
        <button
          className="admin-btn admin-btn-sm admin-btn-danger"
          disabled={!s?.expired || bulkBusy}
          onClick={() => openBulkConfirm("expired", "expired", s?.expired)}
        >
          Expired rooms ({s?.expired ?? 0})
        </button>
        <button
          className="admin-btn admin-btn-sm admin-btn-danger"
          disabled={!s?.ended || bulkBusy}
          onClick={() => openBulkConfirm("ended", "ended", s?.ended)}
        >
          Ended rooms ({s?.ended ?? 0})
        </button>
      </section>

      <div className="admin-toolbar">
        <div className="admin-filters">
          {["all", "active", "expired", "ended"].map((f) => (
            <button
              key={f}
              className={`admin-chip ${filter === f ? "admin-chip-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="admin-input admin-search"
          placeholder="Search code, name or host…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Room</th><th>Status</th><th>People</th><th>Playback</th>
              <th>Content</th><th>Storage</th><th>Last active</th><th />
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 && (
              <tr><td colSpan={8} className="admin-empty">No rooms match this filter.</td></tr>
            )}
            {rooms.map((r) => (
              <tr key={r.invite_token} className={busyToken === r.invite_token ? "admin-row-busy" : ""}>
                <td>
                  <div className="admin-room-code">{r.room_code}</div>
                  <div className="admin-room-sub">{r.room_name} · {r.host_name}</div>
                </td>
                <td><span className={`admin-badge admin-badge-${r.status}`}>{r.status}</span></td>
                <td>
                  <span className={r.online > 0 ? "admin-online" : "admin-offline"}>
                    {r.online} online
                  </span>
                  <div className="admin-room-sub">{r.participants} total</div>
                </td>
                <td>
                  <span className={`admin-playback admin-playback-${r.playback}`}>{r.playback}</span>
                </td>
                <td>
                  {r.content_type ? (
                    <>
                      <div className="admin-content-type">{r.content_type.replace(/_/g, " ")}</div>
                      {r.content_label && (
                        <div className="admin-room-sub admin-truncate" title={r.content_label}>
                          {r.content_label}
                        </div>
                      )}
                    </>
                  ) : <span className="admin-room-sub">none</span>}
                </td>
                <td className={r.upload_bytes ? "admin-storage" : ""}>{fmtBytes(r.upload_bytes)}</td>
                <td className="admin-room-sub">{fmtAgo(r.last_active_at)}</td>
                <td className="admin-actions">
                  {(r.content_type || r.upload_bytes > 0) && (
                    <button
                      className="admin-btn admin-btn-sm"
                      disabled={busyToken === r.invite_token}
                      onClick={() => setConfirming({ token: r.invite_token, code: r.room_code, scope: "content" })}
                    >
                      Clear content
                    </button>
                  )}
                  <button
                    className="admin-btn admin-btn-sm admin-btn-danger"
                    disabled={busyToken === r.invite_token}
                    onClick={() => setConfirming({ token: r.invite_token, code: r.room_code, scope: "room" })}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirming && (
        <div className="admin-modal-overlay" onClick={() => setConfirming(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirming.scope === "room" ? "Delete room?" : "Clear room content?"}</h3>
            <p>
              {confirming.scope === "room" ? (
                <>Room <strong>{confirming.code}</strong>, its chat history and any uploaded video
                will be permanently deleted. Anyone still in the room will be disconnected.</>
              ) : (
                <>The uploaded video and selected source for <strong>{confirming.code}</strong> will
                be permanently deleted. The room itself stays.</>
              )}
            </p>
            <p className="admin-modal-warn">This cannot be undone.</p>
            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="admin-btn admin-btn-danger" onClick={doDelete}>
                {confirming.scope === "room" ? "Delete room" : "Clear content"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirming && (
        <div className="admin-modal-overlay" onClick={() => setBulkConfirming(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {bulkConfirming.count} {bulkConfirming.label} rooms?</h3>
            <p>
              <strong>{bulkConfirming.count}</strong> rooms, their chat history and any uploaded
              video will be permanently deleted. Anyone still connected to one will be disconnected.
            </p>
            <p className="admin-modal-warn">This cannot be undone.</p>
            <p className="admin-modal-typed-prompt">
              Type <strong>{bulkConfirming.count}</strong> to confirm.
            </p>
            <input
              type="text"
              inputMode="numeric"
              className="admin-input"
              value={bulkTyped}
              onChange={(e) => setBulkTyped(e.target.value)}
              autoFocus
              placeholder={String(bulkConfirming.count)}
            />
            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setBulkConfirming(null)}>Cancel</button>
              <button
                className="admin-btn admin-btn-danger"
                disabled={bulkTyped.trim() !== String(bulkConfirming.count) || bulkBusy}
                onClick={doBulkDelete}
              >
                {bulkBusy ? "Deleting…" : `Delete ${bulkConfirming.count} rooms`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone = "" }) {
  return (
    <div className={`admin-stat ${tone ? `admin-stat-${tone}` : ""}`}>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sub:   PropTypes.string,
  tone:  PropTypes.string,
};
