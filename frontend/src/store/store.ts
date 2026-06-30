import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createAuthSlice } from '@/store/slices/authSlice'
import type { StoreState } from '@/store/store.types'

// Root Zustand store composed from feature slices. Endpoint workflows live outside of the store.
export const useStore = create<StoreState>()(
  devtools(
    // Combine all slices into one store object.
    (...storeApi) => {
      return {
        ...createAuthSlice(...storeApi),
      }
    },
    {
      // Turn on Redux DevTools only in development.
      enabled: import.meta.env.DEV,
      // Name shown in DevTools.
      name: 'ft_transcendence',
    },
  ),
)

// Re-export shared auth user type for convenience.
export type { AuthUser } from '@/types/auth'
