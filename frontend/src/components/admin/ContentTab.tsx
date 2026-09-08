import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom' // or your router's link component
import { Search, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminArticle } from '@/types/admin'

// Mirrors the backend's cap on article/comment removal reasons (see
// REMOVE_REASON_MAX_LENGTH in admin.routes.ts / comments.route-helpers.ts).
const REASON_MAX_LENGTH = 500

const CATEGORIES = ['PROGRAMMING', 'CAREER', 'STUDY_NOTES', 'PROJECTS', 'LIFE', 'OPINION']

type ContentTabProps = {
  articles: AdminArticle[]
  onRemoveArticle: (articleId: string, reason: string) => Promise<void>
}

export function ContentTab({ articles, onRemoveArticle }: ContentTabProps) {
  const { t } = useTranslation()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')

  const filteredArticles = useMemo(() => {
    const author = authorFilter.trim().toLowerCase()
    return articles.filter((article) => {
      if (categoryFilter && article.category !== categoryFilter) return false
      if (author && !article.author?.username?.toLowerCase().includes(author)) return false
      return true
    })
  }, [articles, categoryFilter, authorFilter])

  const hasActiveFilters = categoryFilter !== '' || authorFilter.trim() !== ''

  const clearFilters = () => {
    setCategoryFilter('')
    setAuthorFilter('')
  }

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

      <div className="mt-4 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="min-w-[180px]">
          <label htmlFor="content-category-filter" className="mb-1 block text-sm font-medium text-slate-700">
            {t('admin.filterCategoryLabel')}
          </label>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              id="content-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">{t('admin.categories.ALL')}</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.categories.${value}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-[220px] flex-1">
          <label htmlFor="content-author-filter" className="mb-1 block text-sm font-medium text-slate-700">
            {t('admin.filterAuthorLabel')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="content-author-filter"
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

        {hasActiveFilters && (
          <div>
            <span className="mb-1 block text-sm font-medium text-transparent select-none" aria-hidden="true">
              &nbsp;
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-slate-100"
            >
              {t('admin.clearFilters')}
            </button>
          </div>
        )}

        <p className="ml-auto self-end text-sm text-slate-500">
          {t('admin.contentShown', { count: filteredArticles.length, total: articles.length })}
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {filteredArticles.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {t(articles.length === 0 ? 'admin.noContent' : 'admin.noMatchingContent')}
          </li>
        ) : (
          filteredArticles.map((article) => (
          <li
            key={article.id}
            className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-white/60 hover:border-purple-300 hover:bg-purple-50/40"
          >
            {/* Clickable area */}
            <Link
              to={`/articles/${article.id}`}
              className="flex flex-1 items-center gap-4"
              target="_blank"
              rel="noopener noreferrer"
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
              <span className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600">
                {t('admin.removed')}
              </span>
            ) : (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  startRemove(article)
                }}
                variant="destructiveSoft"
              >
                {t('admin.remove')}
              </Button>
            )}
          </li>
        )))}
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
              maxLength={REASON_MAX_LENGTH}
            />
            <p className={`mt-1 text-right text-xs ${reason.length > REASON_MAX_LENGTH * 0.9 ? 'text-pink-500' : 'text-slate-400'}`}>
              {t('common.counter', { count: reason.length, max: REASON_MAX_LENGTH })}
            </p>

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
              <Button
                type="button"
                onClick={confirmRemove}
                disabled={reason.trim().length === 0 || reason.trim().length > REASON_MAX_LENGTH}
                variant="destructiveSoft"
              >
                {t('admin.remove')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

