// Shared display helpers for articles and their authors.
import i18n from '@/lib/i18n'

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

// Strip common markdown syntax down to plain text, for previews (e.g. article
// cards) that can't render real markdown without breaking a line-clamp.
export const stripMarkdown = (markdown: string) => {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '') // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '') // ordered list markers
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/\n{2,}/g, ' ') // collapse blank lines
    .replace(/\n/g, ' ')
    .trim()
}

// Translated category label, e.g. "STUDY_NOTES" -> "Study Notes". Falls back
// to a naive title-case of the raw category key if no translation exists.
export const formatCategoryLabel = (category: string) => {
  const fallback = category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return i18n.t(`common.categories.${category}`, { defaultValue: fallback })
}
