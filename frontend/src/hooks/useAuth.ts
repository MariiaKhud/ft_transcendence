import { useEffect } from 'react'                 // Importing useEffect from React for performing side effects in functional components, such as restoring authentication state on component mount
import { useAuthStore } from '@/store/authStore'  // Importing the useAuthStore hook from the authStore file to access the authentication state and user information in the useAuth hook

// UseAuthOptions interface defines the shape of the options object that can be passed to the useAuth hook. It currently includes a single optional property, restoreOnMount,
// which is a boolean indicating whether to restore the authentication session when the component using the hook mounts.
interface UseAuthOptions {
  restoreOnMount?: boolean
}

/**
 * @brief The useAuth hook is a custom React hook that provides an interface for managing user authentication state in the application. It utilizes the useAuthStore
 * to access and manipulate the authentication state, including the current user, loading status, and functions for login, logout, and session restoration. The hook also
 * accepts an optional configuration object to specify whether to restore the authentication session on component mount.
 * @function useAuth
 * @param {UseAuthOptions} options - Optional configuration for the useAuth hook, allowing for session restoration on mount.
 * @returns {Object} An object containing the current user, loading status, authentication status, and functions for login, logout, and session restoration.
 */
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

  // Using useEffect to restore the authentication session when the component mounts, if the restoreOnMount option is set to true.
  // This ensures that the user's authentication state is maintained across page reloads or when navigating back to the app.
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
