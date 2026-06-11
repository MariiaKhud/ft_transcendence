import { createBrowserRouter } from 'react-router-dom'  // For creating a router instance for the React application, which defines the routes and their corresponding components for navigation within the app.
import App from '@/App'                                 // For the main App component that serves as the root component for the React application, providing the overall layout and structure of the app, including the header and main content area where different pages will be rendered based on the defined routes.
import { Home } from '@/pages/Home'    	                // For the HomePage component that represents the home page of the application and will be rendered when the user navigates to the root path ("/") of the app.
import { Feed } from '@/pages/Feed'                     // For the FeedPage component that represents the feed page of the application and will be rendered when the user navigates to the "/feed" path of the app. This page typically displays a feed of content, such as posts or updates, for the authenticated user.
import { Login } from '@/pages/Login'                   // For the LoginPage component that represents the login page of the application and will be rendered when the user navigates to the "/login" path of the app. This page typically contains a form for users to enter their credentials and log in to the application.
import { Register } from '@/pages/Register'             // For the RegisterPage component that represents the registration page of the application and will be rendered when the user navigates to the "/register" path of the app. This page typically contains a form for new users to create an account by providing their information and credentials.
import { NotFound } from '@/pages/NotFound'             // For the NotFound component that represents a 404 error page and will be rendered when the user navigates to a path that does not match any of the defined routes in the application. This page typically informs the user that the requested page was not found and may provide options to navigate back to the home page or other relevant sections of the app.

/**
 * @brief The router configuration defines the routes for the React application using the createBrowserRouter function from react-router-dom. It specifies the paths
 * and their corresponding components that will be rendered when a user navigates to those paths. The router includes a root route ("/") that renders the App component,
 * which serves as the main layout for the application. Nested within the root route are child routes for the home page ("/"), login page ("/login"), registration page
 * ("/register"), feed page ("/feed"), and a catch-all route ("*") that renders the NotFound component for any undefined paths. This configuration allows for structured
 * navigation within the app and ensures that users are directed to the appropriate pages based on their interactions with the application's navigation links.
 * @constant {Object} router - The router configuration object created using createBrowserRouter, which defines the routes and their corresponding components for the React
 * application.
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
        path: 'register',
        element: <Register />,
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
