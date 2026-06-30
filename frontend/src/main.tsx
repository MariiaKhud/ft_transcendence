import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'	
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import './index.css'

// Show a clear error if #root is missing.
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')

// Start the app with the router.
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
