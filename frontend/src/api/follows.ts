import { apiRequest, apiRequestData } from '@/api/client'

// Follow a user by id.
export async function followUser(userId: string) {
  await apiRequest(`/follows/${userId}`, {
    method: 'POST',
    fallbackMessage: 'Unable to follow user',
  })
}

// Unfollow a user by id.
export async function unfollowUser(userId: string) {
  await apiRequest(`/follows/${userId}`, {
    method: 'DELETE',
    fallbackMessage: 'Unable to unfollow user',
  })
}

// Read whether the current user follows target user.
export async function getFollowStatus(userId: string): Promise<{ isFollowing: boolean }> {
  return apiRequestData<{ isFollowing: boolean }>(`/follows/status/${userId}`, {
    fallbackMessage: 'Unable to load follow status',
  })
}
