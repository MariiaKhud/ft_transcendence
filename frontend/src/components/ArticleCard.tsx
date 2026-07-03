import type { Article } from '@/api/articles'

interface ArticleCardProps {
  article: Article
}

/**
 * Displays a single article summary in the global feed.
 */
export const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <article className="rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md hover:shadow-2xl transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{article.title}</h2>
          <p className="text-slate-600 mb-4 line-clamp-2">{article.content}</p>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              {article.author.avatarUrl && (
                <img
                  src={article.author.avatarUrl}
                  alt={article.author.username}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium text-slate-700">
                {article.author.displayName || article.author.username}
              </span>
            </div>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              {article.category}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(article.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex gap-4 text-sm text-slate-600">
            <span>👍 {article.likeCount} likes</span>
            <span>💬 {article._count?.comments || 0} comments</span>
          </div>
        </div>
      </div>
    </article>
  )
}
