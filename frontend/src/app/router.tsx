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
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })))
const TermsOfService = lazy(() => import('@/pages/TermsOfService').then((m) => ({ default: m.TermsOfService })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))

// App routes.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
