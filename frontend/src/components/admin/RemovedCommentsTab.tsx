
import { useMemo, useState } from 'react'
import type { AdminComment } from '@/types/admin'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

type RemovedCommentsTabProps = {
  comments: AdminComment[]
  onRestoreComment: (id: string) => Promise<void>
}

export function RemovedCommentsTab({ comments, onRestoreComment }: RemovedCommentsTabProps) {
  const { t } = useTranslation()
  const [authorFilter, setAuthorFilter] = useState('')

  const filteredComments = useMemo(() => {
    const author = authorFilter.trim().toLowerCase()
    if (!author) return comments
    return comments.filter((comment) => comment.author?.username?.toLowerCase().includes(author))
  }, [comments, authorFilter])

  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-white/50 bg-white/60 p-6">
        <h2 className="text-xl font-bold text-slate-900">
          {t('admin.removedComments')}
        </h2>

        {comments.length > 0 && (
          <div className="mt-4 min-w-[220px] max-w-sm">
            <label htmlFor="removed-comments-author-filter" className="mb-1 block text-sm font-medium text-slate-700">
              {t('admin.filterAuthorLabel')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="removed-comments-author-filter"
                type="text"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                placeholder={t('admin.filterAuthorPlaceholder')}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {authorFilter && (
                <button
                  type="button"
                  onClick={() => setAuthorFilter('')}
                  aria-label={t('common.cancel')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-slate-500">
              {t('admin.noRemovedComments')}
            </p>
          ) : filteredComments.length === 0 ? (
            <p className="text-slate-500">
              {t('admin.noMatchingRemovedComments')}
            </p>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="break-words text-slate-800">
                  {comment.content}
                </p>

                <p className="mt-1 break-words text-sm text-slate-600">
                  {t('admin.contentBy', {
                    username: comment.author?.username,
                  })}
                </p>

                <p className="mt-3 break-words text-sm text-red-700">
                  {t('admin.removedReason', {
                    reason: comment.removedReason,
                  })}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {t('admin.removedAt', {
                    date: comment.removedAt
                      ? new Date(comment.removedAt).toLocaleString()
                      : t('admin.unknownDate'),
                  })}
                </p>

                <button
                  type="button"
                  onClick={() => void onRestoreComment(comment.id)}
                  className="mt-4 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  {t('admin.restoreComment')}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}