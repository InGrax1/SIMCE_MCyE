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
      registerType: 'autoUpdate',
      manifest: {
        name: 'SIMCE Panel de control',
        short_name: 'SIMCE',
        start_url: '/panel/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#155e75',
      },
    }),
  ],
});
