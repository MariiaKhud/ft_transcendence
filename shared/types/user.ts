/**
 * @file user.ts
 * @description This file defines the TypeScript interfaces for users in the application, including
 * the User, UserSummary, RegisterRequest, LoginRequest, AuthUser, and AuthResponse interfaces.
 */




/**
 * @brief Represents the role of a user.
 * @enum {string}
 */
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

/**
 * @brief Represents the structure of a user in the application.
 * @interface User
 * @property {string} id - The unique identifier of the user.
 * @property {string} email - The email address of the user.
 * @property {string} username - The username chosen by the user.
 * @property {string | null} displayName - The display name of the user, which can be null.
 * @property {string | null} avatarUrl - The URL of the user's avatar, which can be null.
 * @property {string | null} bio - A short biography of the user, which can be null.
 * @property {UserRole} role - The role assigned to the user (e.g., USER, MODERATOR, ADMIN).
 * @property {number} xp - The experience points accumulated by the user.
 * @property {number} level - The current level of the user based on their experience points.
 * @property {boolean} isOnline - Indicates whether the user is currently online.
 * @property {string} lastSeenAt - The timestamp of the user's last activity.
 * @property {string} createdAt - The timestamp when the user account was created.
 * @property {string} updatedAt - The timestamp when the user account was last updated.
 */
export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  xp: number
  level: number
  isOnline: boolean
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

/**
 * @brief Represents a summary of a user's information, typically used in lists or references.
 * @interface UserSummary
 * @property {string} id - The unique identifier of the user.
 * @property {string} username - The username chosen by the user.
 * @property {string | null} displayName - The display name of the user, which can be null.
 * @property {string | null} avatarUrl - The URL of the user's avatar, which can be null.
 * @property {UserRole} role - The role assigned to the user (e.g., USER, MODERATOR, ADMIN).
 * @property {number} level - The current level of the user based on their experience points.
 */
export interface UserSummary {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  level: number
}

/**
 * @brief Represents the request payload for registering a new user.
 * @interface RegisterRequest
 * @property {string} email - The email address of the user to be registered.
 * @property {string} username - The username chosen by the user for registration.
 * @property {string} password - The password chosen by the user for registration.
 * @property {string} [displayName] - An optional display name for the user.
 * @note The displayName field is optional and can be omitted during registration.
 */
export interface RegisterRequest {
  email: string
  username: string
  password: string
  displayName?: string
}

/**
 * @brief Represents the request payload for logging in a user.
 * @interface LoginRequest
 * @property {string} email - The email address of the user attempting to log in.
 * @property {string} password - The password of the user attempting to log in.
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * @brief Represents the authenticated user information returned upon successful login or registration.
 * @interface AuthUser
 * @property {string} id - The unique identifier of the authenticated user.
 * @property {string} email - The email address of the authenticated user.
 * @property {string} username - The username of the authenticated user.
 * @property {UserRole} role - The role assigned to the authenticated user (e.g., USER, MODERATOR, ADMIN).
 */
export interface AuthUser {
  id: string
  email: string
  username: string
  role: UserRole
}

/**
 * @brief Represents the response returned upon successful authentication, including the authenticated
 * user information and access token.
 * @interface AuthResponse
 * @property {AuthUser} user - The authenticated user's information.
 * @property {string} accessToken - The access token issued for the authenticated user, used for
 * subsequent API requests.
 */
export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

/**
 * @brief Represents a badge shown on a user's public profile.
 * @interface PublicUserBadge
 * @property {string} id - The unique identifier of the badge.
 * @property {string} name - The badge display name.
 * @property {string} icon - The badge icon asset or emoji.
 */
export interface PublicUserBadge {
  id: string
  name: string
  icon: string
}

/**
 * @brief Represents the public profile payload returned by GET /api/users/:username.
 * @interface PublicUserProfile
 */
export interface PublicUserProfile {
  displayName: string | null
  username: string
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicUserBadge[]
  level: number
  xp: number
}
