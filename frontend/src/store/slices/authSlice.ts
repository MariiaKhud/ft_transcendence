import type { StoreSlice } from '@/store/store.types'
import type { AuthUser } from '@/types/auth'

interface AuthSliceState {
  currentUser: AuthUser | null
  isLoading: boolean
}

interface AuthSliceActions {
  setCurrentUser: (currentUser: AuthUser) => void
  clearCurrentUser: () => void
  setIsLoading: (isLoading: boolean) => void
}

export interface AuthSlice {
  auth: AuthSliceState
  authActions: AuthSliceActions
}

export const createAuthSlice: StoreSlice<AuthSlice> = (set) => {
  return {
    auth: {
      currentUser: null,
      isLoading: false,
    },
    authActions: {
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
    },
  }
}
