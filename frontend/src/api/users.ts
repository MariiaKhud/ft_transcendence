import { apiRequestData, ApiClientError } from '@/api/client'
import type { ProfileArticle, ProfileArticlesResponse, PublicProfile } from '@/types/profile'
import type { PublicProfileApiResponse } from '@/types/users'

export interface UserSearchResult {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export interface UserSearchResponse {
  users: UserSearchResult[]
  // True when the match set was capped server-side, i.e. there are more
  // matches than the ones returned here.
  hasMore: boolean
}

// Search users by (partial, case-insensitive) username. Returns an empty
// list for a blank query rather than erroring.
export const searchUsers = async (query: string): Promise<UserSearchResponse> => {
  return apiRequestData<UserSearchResponse>('/users/search', {
    params: { q: query },
    fallbackMessage: 'Unable to search users',
  })
}

// Load public profile by username.
export const getPublicProfile = async (username: string) => {
  const data = await apiRequestData<PublicProfileApiResponse>(`/users/${encodeURIComponent(username.trim())}`, {
    fallbackMessage: 'Unable to load profile',
  })

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
}

// Send PATCH /users/me with displayName, bio, and/or preferredLanguage.
export const updateMyProfile = async (updates: {
  displayName?: string | null
  bio?: string | null
  preferredLanguage?: string | null
}) => {
  return apiRequestData<import('@/types/auth').AuthUser>('/users/me', {
    method: 'PATCH',
    body: updates,
    fallbackMessage: 'Unable to update profile',
  })
}

// Send POST /users/me/avatar with a file.
export const uploadMyAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('avatar', file)

  return apiRequestData<import('@/types/auth').AuthUser>('/users/me/avatar', {
    method: 'POST',
    body: formData,
    fallbackMessage: 'Unable to upload avatar',
  })
}

// Send DELETE /users/me/avatar to remove the avatar.
export const deleteMyAvatar = async () => {
  return apiRequestData<import('@/types/auth').AuthUser>('/users/me/avatar', {
    method: 'DELETE',
    fallbackMessage: 'Unable to delete avatar',
  })
}

// Load profile articles if that endpoint exists.
export const getProfileArticles = async (username: string): Promise<ProfileArticlesResponse> => {
  try {
    const items = await apiRequestData<ProfileArticle[]>(`/users/${encodeURIComponent(username.trim())}/articles`, {
      fallbackMessage: 'Unable to load articles',
    })

    return {
      items,
      isUnavailable: false,
    }
  } catch (error) {
    // If backend has not added this route yet, return empty list and keep page working.
    if (error instanceof ApiClientError && error.status === 404) {
      return {
        items: [],
        isUnavailable: true,
      }
    }

    throw error
  }
}
