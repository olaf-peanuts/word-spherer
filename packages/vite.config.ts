import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to backend container during dev
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
