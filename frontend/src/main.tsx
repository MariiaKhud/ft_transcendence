import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { router } from '@/app/router'
import i18n from '@/lib/i18n'
import './index.css'

// Show a clear error if #root is missing.
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')

// Start the app with the router.
createRoot(rootEl).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </StrictMode>,
)

// Register the PWA service worker after the page has loaded.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}