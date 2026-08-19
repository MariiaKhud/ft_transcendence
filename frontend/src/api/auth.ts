import { apiRequest, apiRequestData } from '@/api/client'
import type { AuthUser, LoginCredentials, RegisterCredentials } from '@/types/auth'

// Read a cookie by name from the browser.
const getCookie = (name: string) => {
  // In non-browser environments there is no document.
  if (typeof document === 'undefined') {
    return undefined
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

// Create a new account.
export const registerUser = async (credentials: RegisterCredentials) => {
  return apiRequestData<AuthUser>('/auth/register', {
    method: 'POST',
    body: {
      email: credentials.email.trim(),
      username: credentials.username.trim(),
      password: credentials.password,
    },
    fallbackMessage: 'Registration failed',
  })
}

// Sign in with email and password.
export const loginUser = async (credentials: LoginCredentials) => {
  return apiRequestData<AuthUser>('/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email.trim(),
      password: credentials.password,
    },
    fallbackMessage: 'Login failed',
  })
}

// Sign out current user.
export const logoutUser = async () => {
  // Backend expects CSRF token in header for logout.
  const csrfToken = getCookie('csrf_token')

  await apiRequest('/auth/logout', {
    method: 'POST',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
    fallbackMessage: 'Logout failed',
  })
}

// Permanently delete the current account after CSRF validation on the server.
export const deleteMyAccount = async () => {
  const csrfToken = getCookie('csrf_token')

  await apiRequest('/users/me', {
    method: 'DELETE',
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
    fallbackMessage: 'Unable to delete account',
  })
}

// Get currently logged-in user from session cookie.
export const getCurrentUser = async () => {
  return apiRequestData<AuthUser>('/auth/me', {
    fallbackMessage: 'Unable to restore session',
  })
}
