/**
 * @file vite.config.ts
 * @description This file defines the Vite configuration for the frontend of the application, including
 * plugins for React and Tailwind CSS, as well as path aliasing for cleaner imports.
 */




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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
