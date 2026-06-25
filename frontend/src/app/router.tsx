import { createBrowserRouter } from 'react-router-dom'
import App from '@/App'
import { Home } from '@/pages/Home'
import { Feed } from '@/pages/Feed'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Profile } from '@/pages/Profile'
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
        path: 'feed',
        element: <Feed />,
      },
      {
        path: 'profile/:username',
        element: <Profile />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
