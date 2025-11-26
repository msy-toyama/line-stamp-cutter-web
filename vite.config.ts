import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Cloudflare Pages: '/' / GitHub Pages: '/line-stamp-cutter-web/'
  base: process.env.CF_PAGES ? '/' : '/line-stamp-cutter-web/',
  server: {
    port: 3000,
    host: 'localhost',
    strictPort: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
