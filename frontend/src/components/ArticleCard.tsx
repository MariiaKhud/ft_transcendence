import { Link } from 'react-router-dom'
import type { Article } from '@/api/articles'
import { formatCategoryLabel, getInitials, toSafeImageUrl } from '@/lib/article-display'

interface ArticleCardProps {
  article: Article
}

/**
 * Displays a single article summary in the global feed. Clicking it
 * navigates to the full article page.
 */
export const ArticleCard = ({ article }: ArticleCardProps) => {
  const avatarUrl = toSafeImageUrl(article.author.avatarUrl)
  const authorName = article.author.displayName ?? article.author.username

  return (
    <Link
      to={`/articles/${article.id}`}
      className="block rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl"
    >
      <article>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{article.title}</h2>
          <span className="shrink-0 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
            {formatCategoryLabel(article.category)}
          </span>
        </div>

        <p className="mb-4 line-clamp-2 text-slate-600">{article.content}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-semibold text-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt={authorName} className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials(article.author)}</span>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700">{authorName}</span>
            <span className="text-xs text-slate-500">· {new Date(article.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-4 text-sm text-slate-600">
            <span>👍 {article.likeCount}</span>
            <span>💬 {article._count?.comments ?? 0}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
