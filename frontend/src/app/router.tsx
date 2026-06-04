import { createBrowserRouter } from 'react-router-dom'  // For creating a router instance for the React application, which defines the routes and their corresponding components for navigation within the app.
import App from '@/App'                                 // For the main App component that serves as the root component for the React application, providing the overall layout and structure of the app, including the header and main content area where different pages will be rendered based on the defined routes.
import { HomePage } from '@/pages/HomePage'   	        // For the HomePage component that represents the home page of the application and will be rendered when the user navigates to the root path ("/") of the app.
import { LoginPage } from '@/pages/LoginPage'           // For the LoginPage component that represents the login page of the application and will be rendered when the user navigates to the "/login" path of the app. This page typically contains a form for users to enter their credentials and log in to the application.
import { NotFoundPage } from '@/pages/NotFoundPage'     // For any undefined routes (e.g., "/some-nonexistent-page"), the NotFoundPage component will be rendered to inform the user that the requested page does not exist. This is a common practice in web applications to handle 404 errors gracefully and provide a better user experience when navigating to invalid URLs.

/**
 * @brief The router is created using the createBrowserRouter function from react-router-dom, which defines the routes and their corresponding components for navigation
 * within the React application. The router configuration includes a root route ("/") that renders the App component, which serves as the main layout for the application.
 * Nested within the root route are child routes for the home page (index route), login page ("/login"), and a catch-all route ("*") for handling undefined paths.
 * Each route specifies the component to be rendered when the user navigates to that path, allowing for dynamic content rendering based on the URL. This router setup
 * enables seamless navigation between different pages and components in the application while maintaining a consistent layout provided by the App component.
 * @function createBrowserRouter
 * @returns {BrowserRouter} The configured router instance for the React application, which can be used with the RouterProvider component to enable routing capabilities
 * in the app.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
