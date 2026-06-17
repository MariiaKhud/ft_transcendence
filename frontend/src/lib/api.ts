import axios from 'axios'

export interface ApiResponse<TData = unknown> {
  success: boolean
  data?: TData
  message?: string
  error?: string
}

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (axios.isAxiosError<ApiResponse>(error)) {
    return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallbackMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}
