import { Suspense } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Footer } from '@/components/Footer'

const App = () => {
  const navigate = useNavigate()

  // Get user info and logout function.
  const { currentUser, hasRestoredSession, isLoading, logout } = useAuth({ restoreOnMount: true })

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
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

      {/* Top bar. */}
      <header className="relative z-10 border-b border-white/20 bg-white/10 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          {/* App name link. */}
          <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900">
            Codamium
          </Link>
          <div className="flex items-center gap-3">
            {/* Show text while checking login. */}
            {isLoading ? <span className="text-sm font-medium text-slate-700">Checking session...</span> : null}

            {currentUser ? (
              <>
                {/* Write a new article. */}
                <Link
                  to="/articles/new"
                  className="rounded-full border border-purple-200 bg-white/70 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:border-purple-300 hover:bg-white"
                >
                  Write
                </Link>
                {/* Open your profile. */}
                <Link
                  to={`/profile/${currentUser.username}`}
                  className="inline-flex items-center justify-center rounded-full border border-fuchsia-300/60 bg-gradient-to-r from-fuchsia-100 to-purple-100 px-6 py-2 text-sm font-semibold text-fuchsia-800 shadow-sm transition-all hover:scale-105"
                >
                  {((currentUser.displayName ?? currentUser.username).length > 6
                    ? (currentUser.displayName ?? currentUser.username).slice(0, 6) + '...'
                    : (currentUser.displayName ?? currentUser.username))}
                </Link>
                {/* Log out. */}
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await logout()
                      } finally {
                        navigate('/login', { replace: true })
                      }
                    })()
                  }}
                  className="rounded-full border border-purple-200 bg-white/70 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:border-purple-300 hover:bg-white"
                >
                  Logout
                </button>
              </>
            ) : hasRestoredSession ? (
              // If not logged in, show login button.
              <Link
                to="/login"
                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                Login
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* The router shows the current page here. */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-6 py-20">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default App
