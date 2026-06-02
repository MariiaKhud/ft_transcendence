/**
 * @file tailwind.config.ts
 * @description This file defines the Tailwind CSS configuration for the frontend of the application,
 * specifying the content paths to scan for class names and any custom theme extensions or plugins.
 */




// Importing the Config type from Tailwind CSS for type checking
import type { Config } from 'tailwindcss'

// Exporting the Tailwind CSS configuration
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
