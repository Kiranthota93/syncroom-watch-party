# GitHub Secrets Required for CI/CD

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

## Vercel (frontend deployment)

| Secret | How to get it |
|--------|--------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create token |
| `VERCEL_ORG_ID` | Run `vercel link` in `sync-room-ui/`, then read `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Same file → `projectId` |

## Render (backend deployment)

| Secret | How to get it |
|--------|--------------|
| `RENDER_DEPLOY_HOOK_URL` | Render dashboard → your service → **Settings** → **Deploy Hook** → copy URL |

## Setup steps

```bash
# 1. Link the frontend project to Vercel (one-time, local)
cd sync-room-ui
npx vercel link

# 2. Copy the IDs from the generated file
cat .vercel/project.json
# → { "orgId": "...", "projectId": "..." }

# 3. Add all four values as GitHub secrets
```

## Vercel environment variables

After linking, set `VITE_API_URL` in the Vercel dashboard to your Render backend URL:

```
VITE_API_URL = https://your-backend.onrender.com
```

> In Docker the var is empty (nginx proxies). On Vercel (no nginx) it must be set explicitly.
