# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite inlines these at build time — they cannot be changed by restarting the
# container, only by rebuilding. Empty means "use the page's own origin", which
# is what the nginx-proxied compose setup wants.
ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""
ARG VITE_LOG_LEVEL="warn"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL

RUN npm run build

# ── Stage 2: Serve with nginx ───────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
