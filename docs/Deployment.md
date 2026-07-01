# Deployment Guide

SyncRoom deploys across three services:

| Service | What runs there |
|---------|----------------|
| **MongoDB Atlas** | Database |
| **Render** | Node.js backend (Express + Socket.IO) |
| **Vercel** | React frontend (static build) |

---

## 1. MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user (username + password)
3. Whitelist `0.0.0.0/0` (allow all) — Render uses dynamic IPs
4. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sync_db?retryWrites=true&w=majority
   ```
5. Keep this URI — you will paste it into Render in step 2.

---

## 2. Backend — Render

### Option A: Render Blueprint (render.yaml)

1. Push the repository to GitHub
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
3. Connect your GitHub repo — Render will detect `render.yaml` and create the service
4. After creation, open the service → **Environment** and set:

   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | Your Atlas connection string |
   | `CLIENT_URL` | Your Vercel frontend URL (set this after step 3) |

5. Click **Manual Deploy** to trigger the first deploy

### Option B: Manual service

1. New → **Web Service** → connect GitHub repo
2. Root directory: `sync-room-node`
3. Build command: `npm ci --omit=dev`
4. Start command: `node src/server.js`
5. Set the same environment variables above

### After deploy

Your backend URL will be: `https://syncroom-api.onrender.com` (or similar).

> **Render free tier note:** the service sleeps after 15 minutes of inactivity. The first request after sleep takes ~30 seconds (cold start). Upgrade to the $7/mo Starter plan to disable sleep.

---

## 3. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
2. Set **Root Directory** to `sync-room-ui`
3. Vercel auto-detects Vite — accept the defaults
4. Under **Environment Variables** add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://syncroom-api.onrender.com` |

5. Click **Deploy**

### After deploy

Your frontend URL will be: `https://syncroom.vercel.app` (or similar).

---

## 4. Wire the two services together

Go back to **Render → Environment** and update:
```
CLIENT_URL = https://syncroom.vercel.app
```

Redeploy the backend. CORS will now allow requests from your Vercel domain.

---

## 5. GitHub Actions (CI/CD)

Add these secrets to **GitHub → Settings → Secrets → Actions**:

| Secret | Where to find it |
|--------|-----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Run `vercel link` in `sync-room-ui/`, read `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same file |
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → service → **Settings → Deploy Hook** |

From this point, every push to `main` that passes CI automatically deploys both services.

---

## 6. Custom Domain (optional)

### Vercel

1. Vercel dashboard → your project → **Domains** → add your domain
2. Add a CNAME record at your DNS provider pointing to `cname.vercel-dns.com`

### Render

1. Render dashboard → service → **Custom Domain** → add domain
2. Add a CNAME record pointing to your Render service URL

---

## Environment Variable Checklist

### Render (backend)
- [ ] `MONGO_URI` — MongoDB Atlas connection string
- [ ] `CLIENT_URL` — Vercel frontend URL (e.g. `https://syncroom.vercel.app`)
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=warn`

### Vercel (frontend)
- [ ] `VITE_API_URL` — Render backend URL (e.g. `https://syncroom-api.onrender.com`)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| CORS error in browser | `CLIENT_URL` on Render not matching Vercel URL | Update `CLIENT_URL` and redeploy backend |
| Socket.IO fails to connect | `VITE_API_URL` not set on Vercel | Add env var in Vercel dashboard, redeploy |
| 502 on first request | Render cold start | Wait 30s or upgrade to paid plan |
| "Missing env var" crash | `MONGO_URI` or `CLIENT_URL` not set | Set both in Render environment |
| Build fails on Vercel | `VITE_API_URL` not set during build | Add to Vercel env vars (not just runtime) |
