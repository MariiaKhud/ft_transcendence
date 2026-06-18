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
