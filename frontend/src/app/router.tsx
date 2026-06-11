import { createBrowserRouter } from 'react-router-dom'  // For creating a router instance for the React application, which defines the routes and their corresponding components for navigation within the app.
import App from '@/App'                                 // For the main App component that serves as the root component for the React application, providing the overall layout and structure of the app, including the header and main content area where different pages will be rendered based on the defined routes.
import { Home } from '@/pages/Home'    	                // For the HomePage component that represents the home page of the application and will be rendered when the user navigates to the root path ("/") of the app.
import { Feed } from '@/pages/Feed'
import { Login } from '@/pages/Login'                   // For the LoginPage component that represents the login page of the application and will be rendered when the user navigates to the "/login" path of the app. This page typically contains a form for users to enter their credentials and log in to the application.
import { NotFound } from '@/pages/NotFound'             // For the NotFound component that represents a 404 error page and will be rendered when the user navigates to a path that does not match any of the defined routes in the application. This page typically informs the user that the requested page was not found and may provide options to navigate back to the home page or other relevant sections of the app.

/**
 * @brief This file defines the router for the React application using React Router. It sets up the routes for the home page, login page, feed page, and a catch-all
 * route for handling 404 Not Found errors. The router is created using the createBrowserRouter function from react-router-dom, which allows for client-side routing
 * in a single-page application (SPA). Each route is associated with a specific component that will be rendered when the user navigates to that route. The App component
 * serves as the root component for all routes, providing a common layout and structure for the application.
 * @function router
 * @returns {BrowserRouter} The router instance that defines the routes and their corresponding components for navigation within the React application.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'feed',
        element: <Feed />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
