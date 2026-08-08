import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-server only — none of this affects a production build, which is static
// files served by nginx (see Dockerfile / nginx.conf).
//
// loadEnv with an empty prefix is required here: this config runs before Vite
// processes .env, so reading `process.env` directly would silently yield
// undefined for values set only in .env. The empty third argument opts out of
// the usual VITE_ prefix filter, since these are build-tool settings that must
// never be exposed to client code.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Hostnames the dev server will answer to. Vite rejects any Host header not
  // on this list, so a tunnel (ngrok, Cloudflare) needs its domain added or it
  // serves a "host not allowed" page. Env-driven so a rotating tunnel URL
  // doesn't require editing this file.
  const allowedHosts = (env.DEV_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  // Where the dev server proxies /api and /socket.io.
  const apiTarget = env.DEV_API_TARGET || 'http://localhost:8000';

  return {
    plugins: [react()],

    server: {
      allowedHosts,
      proxy: {
        '/api':       { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },

    test: {
      globals:     true,
      environment: 'jsdom',
      include:     ['src/__tests__/**/*.test.js'],
      coverage: {
        provider: 'v8',
        include:  [
          'src/content/**/*.js',
          'src/utils/extractVideoId.js',
          'src/utils/validateFileMetadata.js',
        ],
      },
    },
  };
});
