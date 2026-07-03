import type { StoreSlice } from '@/store/store.types'
import type { AuthUser } from '@/types/auth'

// Auth data kept in the store.
interface AuthSliceState {
  currentUser: AuthUser | null
  isLoading: boolean
  hasRestoredSession: boolean
}

// Functions that update auth data.
interface AuthSliceActions {
  setCurrentUser: (currentUser: AuthUser) => void
  clearCurrentUser: () => void
  setIsLoading: (isLoading: boolean) => void
  setHasRestoredSession: (hasRestoredSession: boolean) => void
}

export interface AuthSlice {
  auth: AuthSliceState
  authActions: AuthSliceActions
}

// Create auth slice with initial state and actions.
export const createAuthSlice: StoreSlice<AuthSlice> = (set) => {
  return {
    auth: {
      // No user at app start.
      currentUser: null,
      // Global loading flag for auth requests.
      isLoading: false,
      // Marks when the initial session restore attempt has finished.
      hasRestoredSession: false,
    },
    authActions: {
      // Save logged-in user.
      setCurrentUser: (currentUser) => {
        set(
          (state) => {
            return {
              auth: {
                ...state.auth,
                currentUser,
              },
            }
          },
          false,
          'auth/setCurrentUser',
        )
      },
      // Clear user on logout or failed restore.
      clearCurrentUser: () => {
        set(
          (state) => {
            return {
              auth: {
                ...state.auth,
                currentUser: null,
              },
            }
          },
          false,
          'auth/clearCurrentUser',
        )
      },
      // Set loading state for auth flows.
      setIsLoading: (isLoading) => {
        set(
          (state) => {
            return {
              auth: {
                ...state.auth,
                isLoading,
              },
            }
          },
          false,
          'auth/setIsLoading',
        )
      },
      setHasRestoredSession: (hasRestoredSession) => {
        set(
          (state) => {
            return {
              auth: {
                ...state.auth,
                hasRestoredSession,
              },
            }
          },
          false,
          'auth/setHasRestoredSession',
        )
      },
    },
  }
}
