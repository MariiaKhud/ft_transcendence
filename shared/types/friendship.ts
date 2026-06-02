/**
 * @file friendship.ts
 * @description This file defines the TypeScript interfaces for managing friendships and follows
 * between users in the application, including the Friendship and Follow interfaces, as well as
 * request interfaces for sending friend requests and updating their status.
 */




// Importing UserSummary type for user information in friendships and follows
import type { UserSummary } from './user'

/**
 * @brief Represents the status of a friendship.
 * @enum {string}
 */
export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

/**
 * @brief Represents the structure of a friendship between two users in the application.	
 * @interface Friendship
 * @property {string} id - The unique identifier of the friendship.
 * @property {string} requesterId - The unique identifier of the user who sent the friend request.
 * @property {string} addresseeId - The unique identifier of the user who received the friend request.
 * @property {FriendStatus} status - The current status of the friendship (e.g., PENDING, ACCEPTED, DECLINED).
 * @property {string} createdAt - The timestamp when the friendship was created.
 * @property {string} updatedAt - The timestamp when the friendship was last updated.
 */
export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendStatus
  createdAt: string
  updatedAt: string
}

/**
 * @brief Represents a friendship along with the information of both users involved in the friendship.
 * @interface FriendshipWithUsers
 * @extends Friendship
 * @property {UserSummary} requester - A summary of the requester's information.
 * @property {UserSummary} addressee - A summary of the addressee's information.
 * @note This interface is useful for displaying friendship information along with user details in the UI.
 */
export interface FriendshipWithUsers extends Friendship {
  requester: UserSummary
  addressee: UserSummary
}

/**
 * @brief Represents the request payload for sending a new friend request.
 * @interface SendFriendRequestRequest
 * @property {string} addresseeId - The unique identifier of the user to whom the friend request is
 * being sent.
 */
export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

/**
 * @brief Represents a follow relationship along with the information of both users involved in the
 * follow.
 * @interface FollowWithUsers
 * @extends Follow
 * @property {UserSummary} follower - A summary of the follower's information.
 * @property {UserSummary} following - A summary of the following user's information.
 * @note This interface is useful for displaying follow information along with user details in the UI.
 */
export interface FollowWithUsers extends Follow {
  follower: UserSummary
  following: UserSummary
}

/**
 * @brief Represents the request payload for sending a new friend request.
 * @interface SendFriendRequestRequest
 * @property {string} addresseeId - The unique identifier of the user to whom the friend request is
 * being sent.
 */
export interface SendFriendRequestRequest {
  addresseeId: string
}

/**
 * @brief Represents the request payload for updating the status of an existing friend request.
 * @interface UpdateFriendRequestStatusRequest
 * @property {Exclude<FriendStatus, 'PENDING'>} status - The new status of the friend request, which
 * must be either ACCEPTED or DECLINED.
 * @note The PENDING status is excluded from this interface because it is not a valid status for
 * updating an existing friend request. This interface is specifically for changing the status to
 * ACCEPTED or DECLINED.
 */
export interface UpdateFriendRequestStatusRequest {
  status: Exclude<FriendStatus, 'PENDING'>
}
