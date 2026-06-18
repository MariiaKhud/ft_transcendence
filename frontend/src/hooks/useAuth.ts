import { useCallback, useEffect } from 'react'
import { getCurrentUser, loginUser, logoutUser } from '@/api/authApi'
import { useStore } from '@/store/store'
import type { LoginCredentials } from '@/types/auth'

// UseAuthOptions interface defines the shape of the options object that can be passed to the useAuth hook. It currently includes a single optional property, restoreOnMount,
// which is a boolean indicating whether to restore the authentication session when the component using the hook mounts.
interface UseAuthOptions {
  restoreOnMount?: boolean
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const currentUser = useStore((state) => {
    return state.auth.currentUser
  })

  const isLoading = useStore((state) => {
    return state.auth.isLoading
  })

  const setCurrentUser = useStore((state) => {
    return state.authActions.setCurrentUser
  })

  const clearCurrentUser = useStore((state) => {
    return state.authActions.clearCurrentUser
  })

  const setIsLoading = useStore((state) => {
    return state.authActions.setIsLoading
  })

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true)

      try {
        const user = await loginUser(credentials)
        setCurrentUser(user)
        return user
      } finally {
        setIsLoading(false)
      }
    },
    [setCurrentUser, setIsLoading]
  )

  const logout = useCallback(
    async () => {
      setIsLoading(true)

      try {
        await logoutUser()
      } finally {
        clearCurrentUser()
        setIsLoading(false)
      }
    },
    [clearCurrentUser, setIsLoading]
  )

  const restoreSession = useCallback(
    async () => {
      setIsLoading(true)

      try {
        const user = await getCurrentUser()
        setCurrentUser(user)
      } catch {
        clearCurrentUser()
      } finally {
        setIsLoading(false)
      }
    },
    [clearCurrentUser, setCurrentUser, setIsLoading]
  )

  // Using useEffect to restore the authentication session when the component mounts, if the restoreOnMount option is set to true.
  // This ensures that the user's authentication state is maintained across page reloads or when navigating back to the app.
  useEffect(
    () => {
      if (!options.restoreOnMount) {
        return
      }

      void restoreSession()
    },
    [options.restoreOnMount, restoreSession]
  )

  return {
    currentUser,
    isLoading,
    isAuthenticated: currentUser !== null,
    login,
    logout,
    restoreSession,
  }
}
