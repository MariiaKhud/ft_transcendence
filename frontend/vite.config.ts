// Importing necessary modules for Vite configuration
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Getting the directory name of the current file for path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Exporting the Vite configuration
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'https://localhost:8443',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'https://localhost:8443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    // The vendor chunk (React, react-router-dom, socket.io-client, etc.) sits
    // just over the default 500kB warning threshold; splitting it out was the
    // point (better caching), so raise the limit instead of chasing the warning.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep third-party deps (node_modules) in their own chunk, separate
        // from app code, so a code change doesn't bust the cache for
        // libraries that didn't actually change.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
