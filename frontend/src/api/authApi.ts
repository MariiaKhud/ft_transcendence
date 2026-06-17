import { apiClient, getApiErrorMessage, type ApiResponse } from '@/lib/api'
import type { AuthUser, LoginCredentials, RegisterCredentials } from '@/types/auth'

const getCookie = (name: string) => {
  if (typeof document === 'undefined') {
    return undefined
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

const requireResponseData = <TData>(payload: ApiResponse<TData>, fallbackMessage: string) => {
  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? payload.message ?? fallbackMessage)
  }

  return payload.data
}

export const registerUser = async (credentials: RegisterCredentials) => {
  try {
    const response = await apiClient.post<ApiResponse<AuthUser>>('/api/auth/register', {
      email: credentials.email.trim(),
      username: credentials.username.trim(),
      password: credentials.password,
    })

    return requireResponseData(response.data, 'Registration failed')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Registration failed'))
  }
}

export const loginUser = async (credentials: LoginCredentials) => {
  try {
    const response = await apiClient.post<ApiResponse<AuthUser>>('/api/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password,
    })

    return requireResponseData(response.data, 'Login failed')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Login failed'))
  }
}

export const logoutUser = async () => {
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

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get<ApiResponse<AuthUser>>('/api/auth/me')
    return requireResponseData(response.data, 'Unable to restore session')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to restore session'))
  }
}
