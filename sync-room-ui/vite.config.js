import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
