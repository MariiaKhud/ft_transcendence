import { apiClient, getApiErrorMessage, type ApiResponse } from '@/lib/api'
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

const requireResponseData = <TData>(payload: ApiResponse<TData>, fallbackMessage: string) => {
  // Make sure API returned usable data.
  if (!payload.success || payload.data === undefined || payload.data === null) {
    throw new Error(payload.error ?? payload.message ?? fallbackMessage)
  }

  return payload.data
}

// Create a new account.
export const registerUser = async (credentials: RegisterCredentials) => {
  try {
    // Trim text fields before sending them.
    const response = await apiClient.post<ApiResponse<AuthUser>>('/api/auth/register', {
      email: credentials.email.trim(),
      username: credentials.username.trim(),
      password: credentials.password,
    })

    return requireResponseData(response.data, 'Registration failed')
  } catch (error) {
    // Convert API errors into a readable message.
    throw new Error(getApiErrorMessage(error, 'Registration failed'))
  }
}

// Sign in with email and password.
export const loginUser = async (credentials: LoginCredentials) => {
  try {
    // Trim email to avoid login issues from extra spaces.
    const response = await apiClient.post<ApiResponse<AuthUser>>('/api/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
    })

    return requireResponseData(response.data, 'Login failed')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Login failed'))
  }
}

// Sign out current user.
export const logoutUser = async () => {
  // Backend expects CSRF token in header for logout.
  const csrfToken = getCookie('csrf_token')

  try {
    await apiClient.post<ApiResponse>(
      '/api/auth/logout',
      undefined,
      {
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
      },
    )
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Logout failed'))
  }
}

// Get currently logged-in user from session cookie.
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get<ApiResponse<AuthUser>>('/api/auth/me')
    return requireResponseData(response.data, 'Unable to restore session')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to restore session'))
  }
}
