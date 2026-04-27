import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo at /Uradoor/
export default defineConfig({
  base: '/Uradoor/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Uradoor — Interval Timer',
        short_name: 'Uradoor',
        description: 'Interval timer for run training (reps, sets, rest periods).',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/Uradoor/',
        start_url: '/Uradoor/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'node'
  }
});
