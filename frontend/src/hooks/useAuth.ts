import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

interface UseAuthOptions {
  restoreOnMount?: boolean
}

export function useAuth(options: UseAuthOptions = {}) {
  const currentUser = useAuthStore(function selectCurrentUser(state) {
    return state.currentUser
  })

  const isLoading = useAuthStore(function selectIsLoading(state) {
    return state.isLoading
  })

  const login = useAuthStore(function selectLogin(state) {
    return state.login
  })

  const logout = useAuthStore(function selectLogout(state) {
    return state.logout
  })

  const restoreSession = useAuthStore(function selectRestoreSession(state) {
    return state.restoreSession
  })

  useEffect(
    function restoreOnMountEffect() {
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
