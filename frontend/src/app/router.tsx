import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'

// Lazily load each page so its code ships in its own chunk instead of the main bundle.
const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })))
const Search = lazy(() => import('@/pages/Search').then((m) => ({ default: m.Search })))
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('@/pages/Register').then((m) => ({ default: m.Register })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })))
const EditProfile = lazy(() => import('@/pages/EditProfile').then((m) => ({ default: m.EditProfile })))
const Article = lazy(() => import('@/pages/Article').then((m) => ({ default: m.Article })))
const CreateArticle = lazy(() => import('@/pages/CreateArticle').then((m) => ({ default: m.CreateArticle })))
const Leaderboard = lazy(() => import('@/pages/Leaderboard').then((m) => ({ default: m.Leaderboard })))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })))
const TermsOfService = lazy(() => import('@/pages/TermsOfService').then((m) => ({ default: m.TermsOfService })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))
const Friends = lazy(() => import('@/pages/Friends').then((m) => ({ default: m.Friends })))
const Notifications = lazy(() => import('@/pages/Notifications').then((m) => ({ default: m.Notifications })))
const Chat = lazy(() => import('@/pages/Chat').then((m) => ({ default: m.Chat })))
// const Leaderboard = lazy(() => import('@/pages/Leaderboard').then((m) => ({ default: m.Leaderboard })))
// const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))

// App routes.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        // Pathless wrapper so a page crash only replaces the routed content
        // (inside App's <Outlet>), keeping the header/footer chrome — same
        // placement the 404 page already gets as a normal child route.
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            index: true,
            element: <Home />,
          },
          {
            path: 'search',
            element: <Search />,
          },
          {
            path: 'leaderboard',
            element: <Leaderboard />,
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
            // The global feed now lives at "/"; keep this as a redirect for old links/bookmarks.
            path: 'feed',
            element: <Navigate to="/" replace />,
          },
          {
            path: 'profile/:username',
            element: <Profile />,
          },
          {
            path: 'articles/new',
            element: <CreateArticle />,
          },
          {
            path: 'articles/:id',
            element: <Article />,
          },
          {
            path: 'settings/profile',
            element: <EditProfile />,
          },
          {
            path: 'privacy-policy',
            element: <PrivacyPolicy />,
          },
          {
            path: 'terms-of-service',
            element: <TermsOfService />,
          },
          {
            path: 'friends',
            element: <Friends />
          },
          {
            path: 'notifications',
            element: <Notifications />
          },
          {
            path: 'chat',
            element: <Chat />
          },  // conversations list
          {
            path: 'chat/:userId',
            element: <Chat />
          },  // open specific conversation
          // {
          //   path: 'leaderboard',
          //   element: <Leaderboard />
          // },
          // {
          //   path: 'admin',
          //   element: <AdminDashboard />
          // },
          {
            path: '*',
            element: <NotFound />,
          },
        ],
      },
    ],
  },
])
