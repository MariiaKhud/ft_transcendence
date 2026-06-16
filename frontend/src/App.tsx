/**
 * @file App.tsx
 * @description This file defines the main App component for the React frontend application, which serves as the root component and sets up the overall
 * layout and routing structure of the application. It includes a header with navigation links and a main content area where different pages and
 * components will be rendered based on the defined routes. The App component uses React Router's Outlet component to render the matched child routes,
 * allowing for nested routing and dynamic content rendering based on the URL. Overall, this file initializes the structure of the frontend application
 * and provides a foundation for building out the various pages and features of the app.
 */



import { Link, Outlet } from 'react-router-dom'   // Importing Link and Outlet components from react-router-dom for navigation and rendering matched child routes in the application
import { useAuth } from '@/hooks/useAuth'         // Importing a custom hook useAuth from the local hooks directory, which is likely used to manage authentication state and provide authentication-related functionality throughout the application

/**
 * @brief The App component is the root component of the React frontend application, responsible for rendering the overall layout, including the header and main content area.
 * It uses the useAuth hook to manage authentication state and conditionally render user information and navigation links based on whether a user is logged in or not.
 * The component also includes decorative elements such as gradient blobs and scattered dots to enhance the visual appeal of the application. The Outlet component from
 * react-router-dom is used to render matched child routes, allowing for dynamic content rendering based on the current URL.
 * @function App
 * @returns {JSX.Element} The rendered App component, which includes the header, main content area, and decorative elements, along with authentication state management and
 * routing functionality.
 */
export default function App() {
  const { currentUser, isLoading, logout } = useAuth({ restoreOnMount: true }) // Using the useAuth hook to access the current user's authentication state, loading status, and logout function. The restoreOnMount option is set to true to restore the authentication state when the component mounts.

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Decorative gradient blob */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 top-20 h-80 w-80 rounded-full bg-gradient-to-br from-pink-200/20 via-purple-200/20 to-blue-200/20 blur-3xl" />
        <div className="absolute -left-40 bottom-20 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200/20 via-cyan-200/20 to-pink-200/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-purple-200/10 to-pink-200/10 blur-3xl" />
      </div>

      {/* Scattered decorative dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <circle cx="100" cy="150" r="3" fill="#c084fc" opacity="0.3" />
          <circle cx="1100" cy="200" r="2" fill="#ec4899" opacity="0.3" />
          <circle cx="300" cy="600" r="2.5" fill="#06b6d4" opacity="0.25" />
          <circle cx="900" cy="700" r="2" fill="#a78bfa" opacity="0.3" />
          <circle cx="600" cy="100" r="1.5" fill="#f472b6" opacity="0.2" />
          <circle cx="150" cy="500" r="2" fill="#60a5fa" opacity="0.25" />
          <circle cx="1050" cy="650" r="2.5" fill="#c084fc" opacity="0.2" />
          <circle cx="700" cy="300" r="1" fill="#22d3ee" opacity="0.3" />
          <circle cx="400" cy="400" r="2" fill="#f97316" opacity="0.15" />
          <circle cx="1000" cy="100" r="1.5" fill="#a855f7" opacity="0.25" />
        </svg>
      </div>

      <header className="relative z-10 border-b border-white/20 bg-white/10 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900">
            Codamium
          </Link>
          <div className="flex items-center gap-3">
            {isLoading ? <span className="text-sm font-medium text-slate-700">Checking session...</span> : null}

            {currentUser ? (
              <>
                <span className="inline-flex items-center rounded-full border border-fuchsia-300/60 bg-gradient-to-r from-fuchsia-100 to-purple-100 px-3 py-1 text-sm font-semibold text-fuchsia-800 shadow-sm">
                  {currentUser.displayName ?? currentUser.username}
                </span>
                <button
                  type="button"
                  onClick={function onLogoutClick() {
                    void logout()
                  }}
                  className="rounded-full border border-purple-200 bg-white/70 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:border-purple-300 hover:bg-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
        <Outlet />
      </main>
    </div>
  )
}
