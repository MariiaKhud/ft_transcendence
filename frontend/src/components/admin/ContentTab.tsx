import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom' // or your router's link component
import type { AdminArticle } from '@/types/admin'

type ContentTabProps = {
  articles: AdminArticle[]
  onRemoveArticle: (articleId: string, reason: string) => Promise<void>
}

export function ContentTab({ articles, onRemoveArticle }: ContentTabProps) {
  const { t } = useTranslation()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const startRemove = (article: AdminArticle) => {
    setRemovingId(article.id)
    setReason('')
  }

  const confirmRemove = async () => {
    if (!removingId) return
    await onRemoveArticle(removingId, reason.trim())
    setRemovingId(null)
    setReason('')
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-slate-800">
        {t('admin.allContent')}
      </h2>

      <ul className="mt-4 space-y-3">
        {articles.map((article) => (
          <li
            key={article.id}
            className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-white/60 hover:border-purple-300 hover:bg-purple-50/40"
          >
            {/* Clickable area */}
            <Link
              to={`/articles/${article.id}`}
              className="flex flex-1 items-center gap-4"
            >
              <div className="flex-1">
                <p className="font-medium text-slate-900 group-hover:text-purple-700">
                  {article.title}
                </p>
                <p className="text-sm text-slate-600">
                  {t('admin.contentBy', {username: article.author?.username,})} • {t(`admin.categories.${article.category}`)}
                </p>
              </div>
            </Link>

            {/* Remove button (still separate) */}
            {article.isRemoved ? (
              <span className="text-sm text-red-600">
                {t('admin.removed')}
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  startRemove(article)
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t('admin.remove')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {removingId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {t('admin.removeArticle')}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t('admin.removeArticleReasonHelp')}
            </p>

            <textarea
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-purple-600 focus:outline-none"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('admin.removeArticleReasonPlaceholder')}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRemovingId(null)
                  setReason('')
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={reason.trim().length === 0}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-red-700"
              >
                {t('admin.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}