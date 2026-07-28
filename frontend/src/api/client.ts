// Standard API envelope used by backend responses.
export interface ApiResponse<TData = unknown> {
  success: boolean
  data?: TData
  message?: string
  error?: string
}

// Request options accepted by the shared API wrapper.
interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'credentials'> {
  body?: BodyInit | object | null
  params?: URLSearchParams | Record<string, unknown>
  fallbackMessage?: string
}

// Extra fields attached to typed API errors.
interface ApiErrorOptions {
  status: number
  url: string
  payload?: unknown
}

export class ApiClientError extends Error {
  status: number
  url: string
  payload?: unknown

  constructor(message: string, options: ApiErrorOptions) {
    super(message)
    this.name = 'ApiClientError'
    this.status = options.status
    this.url = options.url
    this.payload = options.payload
  }
}

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL ?? '/api'
}

// Build a full API URL and append query params when provided.
const appendQueryParams = (path: string, params?: URLSearchParams | Record<string, unknown>) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${getApiBaseUrl()}${normalizedPath}`

  if (!params) {
    return url
  }

  const searchParams = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams()

  if (!(params instanceof URLSearchParams)) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          searchParams.append(key, String(item))
        })
        return
      }

      searchParams.append(key, String(value))
    })
  }

  const query = searchParams.toString()
  return query.length > 0 ? `${url}?${query}` : url
}

// Treat plain objects as JSON bodies, but leave FormData/Blob/etc untouched.
const isJsonLikePayload = (payload: unknown): payload is object => {
  if (payload === null || typeof payload !== 'object') {
    return false
  }

  return !(
    payload instanceof FormData ||
    payload instanceof Blob ||
    payload instanceof URLSearchParams ||
    payload instanceof ArrayBuffer
  )
}

// Runtime guard for the backend ApiResponse envelope.
const isApiResponse = (payload: unknown): payload is ApiResponse<unknown> => {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      typeof (payload as { success?: unknown }).success === 'boolean',
  )
}

// Parse JSON responses, but allow empty response bodies (e.g. 204).
const parseJsonBody = async (response: Response) => {
  const text = await response.text()

  if (text.trim().length === 0) {
    return undefined
  }

  return JSON.parse(text) as unknown
}

// Derive the most helpful message from API payloads.
const getFailureMessage = (payload: unknown, fallbackMessage: string, status: number) => {
  if (isApiResponse(payload)) {
    return payload.error ?? payload.message ?? fallbackMessage
  }

  if (payload && typeof payload === 'object') {
    const maybeMessage = (payload as { message?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage
    }

    const maybeError = (payload as { error?: unknown }).error
    if (typeof maybeError === 'string' && maybeError.length > 0) {
      return maybeError
    }
  }

  return fallbackMessage || `Request failed with status ${status}`
}

// Core request helper: credentials included, ApiResponse parsed, typed errors thrown.
export const apiRequest = async <TData = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<TData>> => {
  const { body, params, fallbackMessage = 'Request failed', headers, ...restOptions } = options

  const requestHeaders = new Headers(headers)
  let requestBody: BodyInit | undefined

  if (body !== null && body !== undefined) {
    if (isJsonLikePayload(body)) {
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
      }
      requestBody = JSON.stringify(body)
    } else {
      requestBody = body
    }
  }

  const url = appendQueryParams(path, params)
  let response: Response

  try {
    response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include',
      body: requestBody,
    })
  } catch {
    throw new ApiClientError(fallbackMessage, {
      status: 0,
      url,
    })
  }

  let payload: unknown

  try {
    payload = await parseJsonBody(response)
  } catch {
    throw new ApiClientError('Invalid JSON response', {
      status: response.status,
      url,
    })
  }

  if (!response.ok) {
    throw new ApiClientError(getFailureMessage(payload, fallbackMessage, response.status), {
      status: response.status,
      url,
      payload,
    })
  }

  if (payload === undefined && response.status === 204) {
    return { success: true }
  }

  if (!isApiResponse(payload)) {
    throw new ApiClientError('Unexpected API response shape', {
      status: response.status,
      url,
      payload,
    })
  }

  if (!payload.success) {
    throw new ApiClientError(getFailureMessage(payload, fallbackMessage, response.status), {
      status: response.status,
      url,
      payload,
    })
  }

  return payload as ApiResponse<TData>
}

// Convenience helper for endpoints that must return payload.data.
export const apiRequestData = async <TData = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> => {
  const payload = await apiRequest<TData>(path, options)

  if (payload.data === undefined || payload.data === null) {
    throw new ApiClientError(options.fallbackMessage ?? 'Missing response data', {
      status: 200,
      url: appendQueryParams(path, options.params),
      payload,
    })
  }

  return payload.data
}