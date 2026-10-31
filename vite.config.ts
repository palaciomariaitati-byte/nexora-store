import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite runs as Express middleware in development (see server.ts) and
// produces the static bundle served by Express in production.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    // The HTTP server is owned by Express; Vite only attaches HMR.
    hmr: { overlay: true },
  },
});

