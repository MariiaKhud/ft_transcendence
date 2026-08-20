import type { FriendshipState } from '@shared/types/friendship';
import { apiRequest, apiRequestData } from '@/api/client'
import type { Friend, IncomingRequest } from '@/types/friends'

// Shared path prefix for friend-related routes.
const BASE = '/friends'

// Send a new friend request.
export async function sendFriendRequest(userId: string) {
  await apiRequest(`${BASE}/request/${userId}`, {
    method: 'POST',
    fallbackMessage: 'Unable to send friend request',
  })
}

// Accept or decline a received friend request.
export async function respondToFriendRequest(userId: string, action: 'ACCEPTED' | 'DECLINED') {
  await apiRequest(`${BASE}/request/${userId}`, {
    method: 'PATCH',
    body: { action },
    fallbackMessage: 'Unable to respond to friend request',
  })
}

// Cancel a friend request that was previously sent.
export async function cancelFriendRequest(userId: string) {
  await apiRequest(`${BASE}/request/${userId}`, {
    method: 'DELETE',
    fallbackMessage: 'Unable to cancel friend request',
  })
}

// Remove an existing friend relation.
export async function removeFriend(userId: string) {
  await apiRequest(`${BASE}/${userId}`, {
    method: 'DELETE',
    fallbackMessage: 'Unable to remove friend',
  })
}

// List incoming friend requests for current user.
export async function getIncomingRequests() {
  return apiRequest<IncomingRequest[]>(`${BASE}/requests`, {
    fallbackMessage: 'Unable to load incoming requests',
  })
}

// List current friends.
export async function getFriends() {
  return apiRequest<Friend[]>(`${BASE}`, {
    fallbackMessage: 'Unable to load friends',
  })
}

// List outgoing friend requests sent by current user.
export async function getSentRequests() {
  return apiRequest(`${BASE}/requests/sent`, {
    fallbackMessage: 'Unable to load sent requests',
  })
}

// Read relationship state between current user and target user.
export async function getFriendshipStatus(userId: string): Promise<{ state: FriendshipState }> {
  return apiRequestData<{ state: FriendshipState }>(`${BASE}/status/${userId}`, {
    fallbackMessage: 'Unable to load friendship status',
  })
}
