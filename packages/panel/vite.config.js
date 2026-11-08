import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/panel/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,webmanifest}'] },
      manifest: {
        name: 'SIMCE Panel de control',
        short_name: 'SIMCE',
        start_url: '/panel/',
        display: 'standalone',
        scope: '/panel/',
        icons: [
          { src: '/panel/simce-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          {
            src: '/panel/simce-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        background_color: '#f8fafc',
        theme_color: '#155e75',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
});
