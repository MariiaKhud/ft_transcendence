import { create } from 'zustand'     // Importing the create function from the zustand library to create a global state store for authentication in the React application

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

// Defining a TypeScript interface for the authentication state, which includes the user object (of type AuthUser or null), an isAuthenticated boolean to indicate if the user is logged in,
interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
  clearUser: () => void
}

/**
 * @brief useAuthStore is a custom hook created using the zustand library that provides a global state store for managing authentication in the React application.
 * It defines the initial state of the authentication, which includes a user object (initially null) and an isAuthenticated boolean (initially false).
 * It also provides two functions: setUser to update the user information and set isAuthenticated to true when a user logs in, and clearUser to reset the user information
 * and set isAuthenticated to false when a user logs out. This store can be accessed from any component in the application to manage and access the authentication state
 * without prop drilling.
 * @function useAuthStore
 * @returns {AuthState} The authentication state, including the user information, authentication status, and functions to update and clear the user data.
 */
export const useAuthStore = create<AuthState>(function authStore(set) {
  return {
    user: null,
    isAuthenticated: false,
    setUser: function setUser(user) {
      set({ user, isAuthenticated: true })
    },
    clearUser: function clearUser() {
      set({ user: null, isAuthenticated: false })
    },
  }
})