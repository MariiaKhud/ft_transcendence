// Load .env variables before anything else.
// This must be the very first import so all modules get the env vars they need.
import dotenv from 'dotenv'
dotenv.config()

// Import the app only after env vars are loaded.
import './server.js'
