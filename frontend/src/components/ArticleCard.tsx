import { Link } from 'react-router-dom'
import type { Article } from '@/api/articles'
import { formatCategoryLabel, getInitials, stripMarkdown, toSafeImageUrl } from '@/lib/article-display'

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
    <article className="relative rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl">
      {/* Stretched link: makes the whole card clickable to the article, while
          sitting below the author avatar/name so those can link elsewhere. */}
      <Link to={`/articles/${article.id}`} className="absolute inset-0 z-0" aria-label={article.title} />

      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between gap-4">
          <h2 className="mb-2 min-w-0 break-words text-2xl font-bold text-slate-900">{article.title}</h2>
          <span className="shrink-0 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
            {formatCategoryLabel(article.category)}
          </span>
        </div>

        <p className="mb-4 line-clamp-2 break-words text-slate-600">{stripMarkdown(article.content)}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${article.author.username}`}
              className="pointer-events-auto flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-semibold text-white"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={authorName} className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials(article.author)}</span>
              )}
            </Link>
            <Link
              to={`/profile/${article.author.username}`}
              className="pointer-events-auto text-sm font-medium text-slate-700 hover:text-purple-700"
            >
              {authorName}
            </Link>
            <span className="text-xs text-slate-500">· {new Date(article.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-4 text-sm text-slate-600">
            <span>👍 {article.likeCount}</span>
            <span>💬 {article._count?.comments ?? 0}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
