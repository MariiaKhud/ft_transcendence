
export type ISODateTime = string

// Common API response format.
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
  // Stable, machine-readable identifier for `error` (e.g. "user_not_found"),
  // used by the frontend to render a translated message instead of the
  // English `error` text. Absent on success responses.
  code?: string
}

// Paging info for list endpoints.
export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Generic paginated payload.
export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}
