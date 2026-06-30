import { apiClient, type ApiResponse } from '@/lib/api'

/**
 * Article item in the feed.
 */
export interface Article {
  id: string
  title: string
  content: string
  category: string
  likeCount: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  _count?: {
    comments: number
  }
}

/**
 * Pagination metadata.
 */
export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Response from GET /api/articles.
 */
export interface ArticlesResponse extends ApiResponse {
  data: {
    articles: Article[]
    pagination: PaginationData
  }
}

/**
 * Query parameters for articles endpoint.
 */
export interface GetArticlesParams {
  page?: number
  limit?: number
  category?: string
  sort?: 'newest' | 'oldest' | 'most_liked'
  search?: string
}

/**
 * Fetches articles from the global feed with filtering and pagination.
 * @param params Query parameters
 * @returns Articles data with pagination metadata
 */
export const getArticles = async (params?: GetArticlesParams): Promise<ArticlesResponse> => {
  const response = await apiClient.get<ArticlesResponse>('/articles', { params })
  return response.data
}
