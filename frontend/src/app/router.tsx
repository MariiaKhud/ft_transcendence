import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from '@/App'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Profile } from '@/pages/Profile'
import { EditProfile } from '@/pages/EditProfile'
import { Article } from '@/pages/Article'
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
        path: 'articles/:id',
        element: <Article />,
      },
      {
        path: 'settings/profile',
        element: <EditProfile />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
