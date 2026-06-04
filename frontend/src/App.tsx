/**
 * @file App.tsx
 * @description This file defines the main App component for the React frontend application, which serves as the root component and sets up the overall
 * layout and routing structure of the application. It includes a header with navigation links and a main content area where different pages and
 * components will be rendered based on the defined routes. The App component uses React Router's Outlet component to render the matched child routes,
 * allowing for nested routing and dynamic content rendering based on the URL. Overall, this file initializes the structure of the frontend application
 * and provides a foundation for building out the various pages and features of the app.
 */



import { Link, Outlet } from 'react-router-dom'   // Importing Link and Outlet components from react-router-dom for navigation and rendering matched child routes in the application

/**
 * @brief The App component serves as the root component for the React frontend application, defining the overall layout and structure of the app. It includes
 * a header with navigation links to the home page and login page, and a main content area where different pages and components will be rendered based on the
 * defined routes. The Outlet component from react-router-dom is used to render the matched child routes, allowing for nested routing and dynamic content
 * rendering based on the URL. The App component also applies Tailwind CSS classes for styling the layout and appearance of the application.
 * @function App
 * @returns {JSX.Element} The rendered App component containing the header and main content area with routing capabilities.
 */
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
            ft_transcendence
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Login
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
