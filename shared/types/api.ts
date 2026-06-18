
export type ISODateTime = string

// Common API response format.
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
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
