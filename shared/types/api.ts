/**
 * @file api.ts
 * @description This file defines the TypeScript interfaces for generic API responses and pagination
 * metadata used across the application. These types help standardize the structure of API responses
 * and make it easier to handle paginated data from the backend.
 */




/**
 * @brief Represents a generic API response.
 * @template T The type of the data returned in the response.
 * @property {boolean} success Indicates whether the API call was successful.
 * @property {string} [message] An optional message providing additional information about the response.
 * @property {T} [data] The data returned from the API call, if any.
 * @property {string} [error] An optional error message if the API call was not successful.
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

/**
 * @brief Represents pagination metadata for paginated API responses.
 * @property {number} page The current page number.
 * @property {number} pageSize The number of items per page.
 * @property {number} totalItems The total number of items available.
 * @property {number} totalPages The total number of pages available.
 * @property {boolean} hasNextPage Indicates if there is a next page available.
 * @property {boolean} hasPreviousPage Indicates if there is a previous page available.
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * @brief Represents a paginated response from the API.
 * @template T The type of the items in the paginated response.
 * @property {T[]} items An array of items returned in the current page.
 * @property {PaginationMeta} meta Metadata about the pagination state.
 */
export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}
