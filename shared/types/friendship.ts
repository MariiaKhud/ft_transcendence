



// Importing UserSummary type for user information in friendships and follows
import type { UserSummary } from './user'

export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendStatus
  createdAt: string
  updatedAt: string
}

export interface FriendshipWithUsers extends Friendship {
  requester: UserSummary
  addressee: UserSummary
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

export interface FollowWithUsers extends Follow {
  follower: UserSummary
  following: UserSummary
}

export interface SendFriendRequestRequest {
  addresseeId: string
}

export interface UpdateFriendRequestStatusRequest {
  status: Exclude<FriendStatus, 'PENDING'>
}
