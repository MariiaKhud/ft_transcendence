export interface Friend {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isOnline: boolean
  lastSeenAt: string
  friendshipId: string
  since: string
}

export interface IncomingRequest {
  id: string
  requesterId: string
  createdAt: string
  requester: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}
