import { useCallback, useEffect } from 'react'
import { getCurrentUser, loginUser, logoutUser } from '@/api/authApi'
import { useStore } from '@/store/store'
import type { LoginCredentials } from '@/types/auth'

// Hook options.
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

  // Restore user session when needed.
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
