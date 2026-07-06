import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Profile } from '@/pages/Profile'
import { EditProfile } from '@/pages/EditProfile'
import { PrivacyPolicy } from '@/pages/PrivacyPolicy'
import { NotFound } from '@/pages/NotFound'

// App routes.
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
        // The global feed now lives at "/"; keep this as a redirect for old links/bookmarks.
        path: 'feed',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'profile/:username',
        element: <Profile />,
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
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
