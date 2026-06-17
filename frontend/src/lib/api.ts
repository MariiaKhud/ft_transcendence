export interface ApiResponse<TData = unknown> {
  success: boolean
  data?: TData
  error?: string
}

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

export const readJson = async <TPayload>(response: Response): Promise<TPayload> => {
  return response.json()
}
