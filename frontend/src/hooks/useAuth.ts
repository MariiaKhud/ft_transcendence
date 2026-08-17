import { useCallback, useEffect } from 'react'
import { getCurrentUser, loginUser, logoutUser } from '@/api/auth'
import { useStore } from '@/store/store'
import { applyPreferredLanguage } from '@/lib/i18n'
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

  const hasRestoredSession = useStore((state) => {
    return state.auth.hasRestoredSession
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

  const setHasRestoredSession = useStore((state) => {
    return state.authActions.setHasRestoredSession
  })

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true)

      try {
        const user = await loginUser(credentials)
        setCurrentUser(user)
        applyPreferredLanguage(user.preferredLanguage)
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
        applyPreferredLanguage(user.preferredLanguage)
      } catch {
        clearCurrentUser()
      } finally {
        setHasRestoredSession(true)
        setIsLoading(false)
      }
    },
    [clearCurrentUser, setCurrentUser, setHasRestoredSession, setIsLoading]
  )

  // Restore user session when needed.
  useEffect(
    () => {
      if (!options.restoreOnMount || hasRestoredSession || isLoading) {
        return
      }

      void restoreSession()
    },
    [hasRestoredSession, isLoading, options.restoreOnMount, restoreSession]
  )

  return {
    currentUser,
    isLoading,
    hasRestoredSession,
    isAuthenticated: currentUser !== null,
    login,
    logout,
    restoreSession,
  }
}
