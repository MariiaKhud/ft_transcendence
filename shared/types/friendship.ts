
import type { ISODateTime } from './api'
import type { UserSummary } from './user'

// Friend request states.
export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

// Frontend UI state for FriendButton
export type FriendshipState =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'friends'
  | 'self';

// Friendship relation record.
export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// Friendship plus both user objects.
export interface FriendshipWithUsers extends Friendship {
  requester: UserSummary
  addressee: UserSummary
}

// Follow relation record.
export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: ISODateTime
}

// Follow relation plus both user objects.
export interface FollowWithUsers extends Follow {
  follower: UserSummary
  following: UserSummary
}

// Payload to send a friend request.
export interface SendFriendRequestRequest {
  addresseeId: string
}

// Payload to accept/decline a friend request.
export interface UpdateFriendRequestStatusRequest {
  status: Exclude<FriendStatus, 'PENDING'>
}
