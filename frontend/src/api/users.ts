import axios from 'axios'
import { apiClient, getApiErrorMessage, type ApiResponse } from '@/lib/api'
import type { ProfileArticle, ProfileArticlesResponse, PublicProfile } from '@/types/profile'
import type { PublicProfileApiResponse } from '@/types/users'

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
      `/users/${encodeURIComponent(username.trim())}`,
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
      id: data.id,
    } satisfies PublicProfile
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load profile'))
  }
}

// Send PATCH /users/me with displayName and/or bio.
export const updateMyProfile = async (updates: { displayName?: string | null; bio?: string | null }) => {
  try {
    const response = await apiClient.patch<ApiResponse<import('@/types/auth').AuthUser>>('/users/me', updates)
    return requireResponseData(response.data, 'Unable to update profile')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to update profile'))
  }
}

// Send POST /users/me/avatar with a file.
export const uploadMyAvatar = async (file: File) => {
  try {
    const formData = new FormData()
    formData.append('avatar', file)
    // Set Content-Type to undefined so axios drops the instance-level
    // 'application/json' default and lets the browser set the correct
    // multipart/form-data boundary automatically.
    const response = await apiClient.post<ApiResponse<import('@/types/auth').AuthUser>>(
      '/users/me/avatar',
      formData,
      { headers: { 'Content-Type': undefined } },
    )
    return requireResponseData(response.data, 'Unable to upload avatar')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to upload avatar'))
  }
}

// Send DELETE /users/me/avatar to remove the avatar.
export const deleteMyAvatar = async () => {
  try {
    const response = await apiClient.delete<ApiResponse<import('@/types/auth').AuthUser>>('/users/me/avatar')
    return requireResponseData(response.data, 'Unable to delete avatar')
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to delete avatar'))
  }
}

// Load profile articles if that endpoint exists.
export const getProfileArticles = async (username: string): Promise<ProfileArticlesResponse> => {
  try {
    const response = await apiClient.get<ApiResponse<ProfileArticle[]>>(
      `/users/${encodeURIComponent(username.trim())}/articles`,
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
