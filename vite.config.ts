import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8000', changeOrigin: true } } },
  build: {
    rollupOptions: {
      output: {
        // Charts and the table engine are heavy and change rarely, so they are
        // split out to keep the application chunk small.
        manualChunks: {
          charts: ['recharts'],
          table: ['@tanstack/react-table'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
});
