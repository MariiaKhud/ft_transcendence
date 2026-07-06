// Shared display helpers for articles and their authors.

interface AuthorLike {
  username: string
  displayName: string | null
}

// Convert relative avatar path to full URL for browser image tag.
export const toSafeImageUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) {
    return null
  }

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
    return avatarUrl
  }

  return `${window.location.origin}${avatarUrl}`
}

// Create initials when the author has no avatar image.
export const getInitials = (author: AuthorLike) => {
  const source = (author.displayName ?? author.username).trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

// Turn "STUDY_NOTES" into "Study Notes" for display.
export const formatCategoryLabel = (category: string) => {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
