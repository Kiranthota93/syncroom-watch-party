# SyncRoom

> Real-time collaborative watch-party platform. Watch YouTube videos and local files in frame-perfect sync — no plugins, no accounts.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![CI](https://github.com/your-username/sync-room/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square)

---

## What is SyncRoom?

SyncRoom is a full-stack real-time application where multiple users join a shared room and watch the same content with **frame-perfect playback synchronization**. The host controls playback; all participants stay locked to the same position via a custom sync engine built on Socket.IO.

**No accounts required.** Create a room, share the code, watch together.

---

## Features

| Category | Features |
|----------|----------|
| **Sync Engine** | Play/pause/seek sync, drift correction heartbeat, join-sync for late arrivals, speed changes |
| **Content** | YouTube videos (URL or video ID), local video files (MP4, MKV, WebM…) |
| **Rooms** | Host/controller roles, transfer control, kick, mute, ready state, raise hand |
| **Chat** | Real-time grouped messages, emoji picker, typing indicators, 48h TTL |
| **Reactions** | Floating emoji reactions over the video |
| **Preferences** | Default name, volume, speed, notifications toggle — persisted in localStorage |
| **History** | Watch history per browser (30-day TTL), active rooms dashboard |
| **UI** | Dark theme, mobile-responsive, skeleton loading, room info dashboard |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios, Vite |
| Real-time | Socket.IO 4 (client + server) |
| Backend | Node.js 20, Express 5 |
| Database | MongoDB Atlas, Mongoose 8 |
| Serving | nginx (reverse proxy + SPA routing) |
| DevOps | Docker, Docker Compose |
| Testing | Vitest (116 unit tests) |

---

## Architecture

```
Browser
  │
  ├─ HTTPS :80 ──► nginx
  │                  ├─ /            ► React SPA (dist/)
  │                  ├─ /api/*       ► backend:8000
  │                  └─ /socket.io/* ► backend:8000 (WebSocket upgrade)
  │
  └─ WebSocket ──────────────────────► Socket.IO server
                                           │
                                       MongoDB Atlas
```

**Sync flow:** controller action → socket event → server saves state → broadcast to room → each client's `PlaybackEngine` applies the command through `SyncGuard` (suppresses echo events) and `SeekDetector` (distinguishes real seeks from buffering).

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas cluster (or local MongoDB)
- Docker + Docker Compose (for containerised setup)

### Local Development

```bash
# 1. Clone
git clone https://github.com/your-username/sync-room.git
cd sync-room

# 2. Backend
cd sync-room-node
cp .env.example .env          # fill in MONGO_URI and CLIENT_URL
npm install
npm run dev                   # nodemon on :8000

# 3. Frontend (new terminal)
cd ../sync-room-ui
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm install
npm run dev                   # Vite on :5173
```

Open `http://localhost:5173`.

### Docker (one command)

```bash
# Copy and fill backend env
cp sync-room-node/.env.example sync-room-node/.env
# Edit MONGO_URI and CLIENT_URL in sync-room-node/.env

docker compose up --build
```

Open `http://localhost`.  
nginx serves the frontend and proxies `/api` + `/socket.io` to the backend — no CORS, no hardcoded URLs.

---

## Environment Variables

### Backend (`sync-room-node/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `8000`) |
| `CLIENT_URL` | **Yes** | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `MONGO_URI` | **Yes** | MongoDB Atlas connection string |
| `NODE_ENV` | No | `development` or `production` |
| `LOG_LEVEL` | No | `debug` / `info` / `warn` / `error` |

Missing `CLIENT_URL` or `MONGO_URI` crashes the server immediately with a clear message.

### Frontend (`sync-room-ui/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL. Leave empty in Docker (nginx proxies automatically). Set to `http://localhost:8000` for local dev. |

---

## Running Tests

```bash
cd sync-room-ui
npm test          # Vitest — 116 unit tests
```

Test coverage: `PlaybackEngine`, `SeekDetector`, `SyncGuard`, `PlaybackStateMachine`, `MediaProvider`, `extractVideoId`, `validateFileMetadata`.

---

## Project Structure

```
sync-room/
├── docker-compose.yml
├── sync-room-node/              # Express + Socket.IO backend
│   ├── src/
│   │   ├── config/              # Environment config + DB connection
│   │   ├── controllers/         # Room business logic
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # REST endpoints
│   │   ├── socket/              # Socket.IO event handlers
│   │   └── utils/               # Logger, watch session recorder
│   └── Dockerfile
└── sync-room-ui/                # React + Vite frontend
    ├── src/
    │   ├── content/             # MediaProvider, PlaybackEngine, PlaybackService
    │   ├── room/                # RoomHeader, VideoStage, LocalVideoPlayer, …
    │   ├── components/          # ChatPanel, NotificationCenter, WatchHistory, …
    │   ├── pages/               # Home, CreateRoom, JoinRoom, Room
    │   └── hooks/               # usePreferences, usePlayback, useChat
    ├── nginx.conf
    └── Dockerfile
```

---

## API Reference

Base URL: `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rooms/create` | Create room |
| POST | `/rooms/join` | Join by code or invite token |
| POST | `/rooms/leave` | Leave room |
| POST | `/rooms/end` | End room (host only) |
| POST | `/rooms/transfer-controller` | Transfer playback control |
| POST | `/rooms/transfer-host` | Transfer host role |
| POST | `/rooms/kick` | Remove participant |
| POST | `/rooms/mute` | Mute/unmute participant chat |
| POST | `/rooms/ready` | Toggle ready state |
| POST | `/rooms/raise-hand` | Raise / lower hand |
| POST | `/rooms/content` | Set content source |
| PATCH | `/rooms/settings` | Update room settings |
| GET | `/rooms/my-rooms` | Active rooms for a client |
| GET | `/rooms/watch-history` | Watch history for a client |
| GET | `/rooms/stats` | Live active room count |
| GET | `/health` | Health check |

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join socket room |
| `room:updated` | Server → Client | Room state changed |
| `room:ended` | Server → Client | Room closed — redirect home |
| `playback:play/pause/seek/rate` | Bidirectional | Playback commands |
| `playback:heartbeat` | Client → Server | Drift detection |
| `playback:sync` | Server → Client | Drift correction |
| `chat:message` | Bidirectional | Chat message |
| `chat:typing` | Bidirectional | Typing indicator |
| `reaction:send/emit` | Bidirectional | Floating emoji reaction |
| `controller:request` | Client → Server | Request playback control |
| `participant:kicked` | Server → Client | You were removed |

---

## Roadmap

| Version | Status | Focus |
|---------|--------|-------|
| V1 — Foundation | ✅ Complete | Room lifecycle, REST API, participant tracking |
| V2 — Real-time | ✅ Complete | Socket.IO, host/controller roles, presence |
| V3 — Playback Engine | ✅ Complete | Sync engine, SeekDetector, heartbeat/drift |
| V4 — Content | ✅ Complete | YouTube + Local Video, universal MediaProvider |
| V4.5 — Hardening | ✅ Complete | 116 unit tests, architecture cleanup |
| V5 — Collaboration | ✅ Complete | Chat, reactions, ready state, preferences, watch history |
| V6 — Production | 🔄 In progress | Docker, CI/CD, security, monitoring, deployment |

---

## Deployment

Full step-by-step guide: [docs/Deployment.md](./docs/Deployment.md)

**Quick summary:**

| Service | Platform | Config file |
|---------|----------|-------------|
| Database | MongoDB Atlas | — |
| Backend | Render | `render.yaml` |
| Frontend | Vercel | `sync-room-ui/vercel.json` |

Set `VITE_API_URL=https://your-backend.onrender.com` in Vercel, and `CLIENT_URL=https://your-app.vercel.app` in Render. Everything else is automatic.

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests where relevant
4. Run the test suite: `npm test`
5. Open a pull request

Please follow the existing code style — ESLint config is in `sync-room-ui/eslint.config.js`.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

*Built with React, Node.js, Socket.IO, and MongoDB.*
