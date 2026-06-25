import axios from 'axios'
import { apiClient, getApiErrorMessage, type ApiResponse } from '@/lib/api'
import type { ProfileArticle, ProfileArticlesResponse, PublicProfile } from '@/types/profile'

interface PublicProfileApiResponse {
  displayName: string | null
  username: string
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicProfile['badges']
  level: number
  xp: number
}

// Make sure API returns valid data.
const requireResponseData = <TData>(payload: ApiResponse<TData>, fallbackMessage: string) => {
  if (!payload.success || payload.data === undefined || payload.data === null) {
    throw new Error(payload.error ?? payload.message ?? fallbackMessage)
  }

  return payload.data
}

// Load public profile by username.
export const getPublicProfile = async (username: string) => {
  try {
    const response = await apiClient.get<ApiResponse<PublicProfileApiResponse>>(
      `/api/users/${encodeURIComponent(username.trim())}`,
    )
    const data = requireResponseData(response.data, 'Unable to load profile')

    return {
      displayName: data.displayName,
      username: data.username,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      followerCount: data.followerCount,
      followingCount: data.followingCount,
      articleCount: data.articleCount,
      badges: data.badges,
      level: data.level,
      experiencePoints: data.xp,
    } satisfies PublicProfile
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load profile'))
  }
}

// Load profile articles if that endpoint exists.
export const getProfileArticles = async (username: string): Promise<ProfileArticlesResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<ProfileArticle[]>>(
      `/api/users/${encodeURIComponent(username.trim())}/articles`,
    )

    const items = requireResponseData(response.data, 'Unable to load articles')
    return {
      items,
      isUnavailable: false,
    }
  } catch (error) {
    // If backend has not added this route yet, return empty list and keep page working.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return {
        items: [],
        isUnavailable: true,
      }
    }

    throw new Error(getApiErrorMessage(error, 'Unable to load articles'))
  }
}
