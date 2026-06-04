/**
 * @file main.tsx
 * @description This file serves as the entry point for the React frontend application, rendering the root component and setting up the router.
 * It imports necessary modules and styles, creates a root element, and renders the application wrapped in React's StrictMode for highlighting
 * potential issues in development. The RouterProvider component from react-router-dom is used to provide routing capabilities to the application,
 * allowing for navigation between different pages and components based on the defined routes in the router configuration.
 * Overall, this file initializes the React application and sets up the necessary infrastructure for routing and rendering the UI.
 */




import { StrictMode } from 'react'                // Importing StrictMode from React to enable additional checks and warnings for potential issues in the application during development
import { createRoot } from 'react-dom/client'     // Importing createRoot from react-dom/client to create a root for rendering the React application in the DOM	
import { RouterProvider } from 'react-router-dom' // Importing RouterProvider from react-router-dom to provide routing capabilities to the application, allowing for navigation between different pages and components based on the defined routes in the router configuration
import { router } from '@/app/router'             // Importing the router configuration from the app/router module, which defines the routes and their corresponding components for the application
import './index.css'

/**
 * @brief The createRoot function is used to create a root for rendering the React application in the DOM. It takes the DOM element with the id 'root'
 * as an argument, which is where the React application will be mounted.
 * @brief The render method is called on the created root to render the application. The application is wrapped in React's StrictMode, which enables
 * additional checks and warnings for potential issues in the application during development. The RouterProvider component from react-router-dom is
 * used to provide routing capabilities to the application, allowing for navigation between different pages and components based on the defined routes
 * in the router configuration.
 * @function createRoot
 * @param {HTMLElement} document.getElementById('root') - The DOM element where the React application will be mounted.
 * @returns {void}
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
