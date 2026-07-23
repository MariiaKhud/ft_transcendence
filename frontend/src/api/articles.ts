import axios from 'axios'
import { apiClient, getApiErrorMessage, type ApiResponse } from '@/lib/api'

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
 * Full article, as returned by GET /api/articles/:id.
 */
export interface ArticleDetail extends Article {
  authorId: string
  commentsCount: number
  // null for guests; true/false for authenticated users.
  isLikedByCurrentUser: boolean | null
}

/**
 * A comment on an article.
 */
export interface Comment {
  id: string
  articleId: string
  authorId: string
  content: string
  isRemoved: boolean
  removedReason: string | null
  removedAt: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    role: 'USER' | 'MODERATOR' | 'ADMIN'
    level: number
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
  title?: string
  author?: string
  content?: string
  postedFrom?: string
  postedTo?: string
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

// Make sure API returns valid data.
const requireResponseData = <TData>(payload: ApiResponse<TData>, fallbackMessage: string) => {
  if (!payload.success || payload.data === undefined || payload.data === null) {
    throw new Error(payload.error ?? payload.message ?? fallbackMessage)
  }

  return payload.data
}

/**
 * Fetches a single article by id, including comment count and the current
 * user's like status.
 */
export const getArticle = async (id: string): Promise<ArticleDetail> => {
  try {
    const response = await apiClient.get<ApiResponse<ArticleDetail>>(`/articles/${id}`)
    return requireResponseData(response.data, 'Unable to load article')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load article'))
  }
}

/**
 * Fields required to publish a new article.
 */
export interface CreateArticleInput {
  title: string
  content: string
  category: string
}

// POST /api/articles doesn't compute isLikedByCurrentUser (there's nothing to like yet).
type CreatedArticle = Omit<ArticleDetail, 'isLikedByCurrentUser'>

/**
 * Sends POST /api/articles to publish a new article. Requires authentication.
 */
export const createArticle = async (input: CreateArticleInput): Promise<CreatedArticle> => {
  try {
    const response = await apiClient.post<ApiResponse<CreatedArticle>>('/articles', input)
    return requireResponseData(response.data, 'Unable to publish article')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to publish article'))
  }
}

/**
 * Fields an author can update on their own article.
 */
export interface UpdateArticleInput {
  title?: string
  content?: string
  category?: string
}

/**
 * Sends PATCH /api/articles/:id. Author-only.
 */
export const updateArticle = async (id: string, updates: UpdateArticleInput): Promise<ArticleDetail> => {
  try {
    const response = await apiClient.patch<ApiResponse<ArticleDetail>>(`/articles/${id}`, updates)
    return requireResponseData(response.data, 'Unable to update article')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to update article'))
  }
}

/**
 * Sends DELETE /api/articles/:id. Author-only.
 */
export const deleteArticle = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/articles/${id}`)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to delete article'))
  }
}

/**
 * Toggles the current user's like on an article: likes it if not yet liked,
 * unlikes it if already liked. Requires authentication.
 */
export const toggleArticleLike = async (id: string): Promise<{ liked: boolean; likeCount: number }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ liked: boolean; likeCount: number }>>(`/articles/${id}/like`)
    return requireResponseData(response.data, 'Unable to update like')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to update like'))
  }
}

/**
 * Result of loading comments — flags when the article (and therefore its
 * comments) can't be found, so the page can degrade gracefully.
 */
export interface GetCommentsResult {
  items: Comment[]
  isUnavailable: boolean
}

/**
 * Fetches all comments for an article, oldest first. Includes soft-removed
 * comments — the UI decides how to render those based on the viewer's role.
 */
export const getComments = async (articleId: string): Promise<GetCommentsResult> => {
  try {
    const response = await apiClient.get<ApiResponse<Comment[]>>(`/articles/${articleId}/comments`)
    const items = requireResponseData(response.data, 'Unable to load comments')
    return { items, isUnavailable: false }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { items: [], isUnavailable: true }
    }

    throw new Error(getApiErrorMessage(error, 'Unable to load comments'))
  }
}

/**
 * Posts a new comment on an article. Requires authentication.
 */
export const createComment = async (articleId: string, content: string): Promise<Comment> => {
  try {
    const response = await apiClient.post<ApiResponse<Comment>>(`/articles/${articleId}/comments`, { content })
    return requireResponseData(response.data, 'Unable to post comment')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to post comment'))
  }
}

/**
 * Sends PATCH /api/comments/:id. Author-only.
 */
export const updateComment = async (id: string, content: string): Promise<Comment> => {
  try {
    const response = await apiClient.patch<ApiResponse<Comment>>(`/comments/${id}`, { content })
    return requireResponseData(response.data, 'Unable to update comment')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to update comment'))
  }
}

/**
 * Sends DELETE /api/comments/:id. The author hard-deletes their own comment
 * (no `reason`); a moderator/admin soft-removes someone else's comment and
 * must supply a `reason`, getting back the updated (now-removed) comment.
 */
export const deleteComment = async (id: string, reason?: string): Promise<{ id: string } | Comment> => {
  try {
    const response = await apiClient.delete<ApiResponse<{ id: string } | Comment>>(`/comments/${id}`, {
      data: reason ? { reason } : undefined,
    })
    return requireResponseData(response.data, 'Unable to delete comment')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to delete comment'))
  }
}
