import { create } from 'zustand'     // Importing the create function from the zustand library to create a global state store for authentication in the React application
import { getApiBaseUrl, readJson, type ApiResponse } from '@/lib/api'

// zustand is a small, fast, and scalable state management solution for React applications. It allows you to create a global store that can be accessed and updated from
// any component in the application without the need for prop drilling or complex state management patterns. In this case, we are using zustand to manage the authentication
// state of the user, including their information and authentication status, as well as providing functions to update and clear the user data when necessary.

type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

// Defining a TypeScript interface for the authenticated user, which includes properties such as id, email, username, displayName, avatarUrl, bio, role, xp, level, isOnline
// status, lastSeenAt timestamp, createdAt timestamp, and updatedAt timestamp. This interface will be used to type the user object in the authentication state store.
export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  xp: number
  level: number
  isOnline: boolean
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

const getCookie = (name: string) => {
  if (typeof document === 'undefined') {
    return undefined
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

interface AuthState {
  currentUser: AuthUser | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

/**
 * @brief The useAuthStore is a Zustand store that manages the authentication state of the user in the React application. It provides properties to store the current
 * authenticated user and loading status, as well as functions to handle user login, logout, and session restoration. The store interacts with the backend API to perform
 * authentication-related operations and updates the state accordingly based on the API responses.
 * @function useAuthStore
 * @returns {AuthState} The authentication state store containing the current user, loading status, and authentication functions for login, logout, and session restoration.
 */
export const useAuthStore = create<AuthState>((set) => {
  return {
    currentUser: null,
    isLoading: false,
    login: async (credentials) => {
      set({ isLoading: true })

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: credentials.email.trim(),
            password: credentials.password,
          }),
        })

        const payload = await readJson<ApiResponse<AuthUser>>(response)
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? 'Login failed')
        }

        set({ currentUser: payload.data })
        return payload.data
      } finally {
        set({ isLoading: false })
      }
    },
    logout: async () => {
      set({ isLoading: true })

      try {
        const csrfToken = getCookie('csrf_token')
        const headers: Record<string, string> = {}

        if (csrfToken) {
          headers['x-csrf-token'] = csrfToken
        }

        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          headers,
          credentials: 'include',
        })
      } finally {
        set({ currentUser: null, isLoading: false })
      }
    },
    restoreSession: async () => {
      set({ isLoading: true })

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          set({ currentUser: null })
          return
        }

        const payload = await readJson<ApiResponse<AuthUser>>(response)
        if (!payload.success || !payload.data) {
          set({ currentUser: null })
          return
        }

        set({ currentUser: payload.data })
      } catch {
        set({ currentUser: null })
      } finally {
        set({ isLoading: false })
      }
    },
  }
})
