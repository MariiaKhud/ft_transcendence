



import { StrictMode } from 'react'                // Importing StrictMode from React to enable additional checks and warnings for potential issues in the application during development
import { createRoot } from 'react-dom/client'     // Importing createRoot from react-dom/client to create a root for rendering the React application in the DOM	
import { RouterProvider } from 'react-router-dom' // Importing RouterProvider from react-router-dom to provide routing capabilities to the application, allowing for navigation between different pages and components based on the defined routes in the router configuration
import { router } from '@/app/router'             // Importing the router configuration from the app/router module, which defines the routes and their corresponding components for the application
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
