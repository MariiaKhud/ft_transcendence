import { create } from 'zustand' // Importing the create function from the zustand library to create a global state store for the React application
import { devtools } from 'zustand/middleware'
import { createAuthSlice } from '@/store/slices/authSlice'
import type { StoreState } from '@/store/store.types'

// Root Zustand store composed from feature slices. Endpoint workflows live outside of the store.
export const useStore = create<StoreState>()(
  devtools(
    (...storeApi) => {
      return {
        ...createAuthSlice(...storeApi),
      }
    },
    {
      enabled: import.meta.env.DEV,
      name: 'ft_transcendence',
    },
  ),
)

export type { AuthUser, LoginCredentials } from '@/types/auth'
