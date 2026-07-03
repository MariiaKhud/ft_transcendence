import axios from 'axios'

// Common API response shape.
export interface ApiResponse<TData = unknown> {
  success: boolean
  data?: TData
  message?: string
  error?: string
}

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL ?? '/api'
}

// Shared Axios client for all requests.
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  // Try to read error from API response first.
  if (axios.isAxiosError<ApiResponse>(error)) {
    return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallbackMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}
