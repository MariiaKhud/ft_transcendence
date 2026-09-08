import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArticleCard } from '@/components/ArticleCard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useStore } from '@/store/store'
import { getSocket } from '@/lib/socket'
import { translateApiError } from '@/lib/api-errors'

const SEARCH_MAX_LENGTH = 100
import { getArticles, type Article, type ArticlesResponse } from '@/api/articles'

type SortOption = 'newest' | 'oldest' | 'most_liked'

const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'most_liked']

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  newest: 'sortNewest',
  oldest: 'sortOldest',
  most_liked: 'sortMostLiked',
}

const CATEGORY_VALUES = ['', 'PROGRAMMING', 'CAREER', 'STUDY_NOTES', 'PROJECTS', 'LIFE', 'OPINION']

export const Home = () => {
  const { t } = useTranslation()
  // throw new Error('TEMP_TEST_ERROR')  // Comment this out to test 500 error page
  // Read current user from global store (guests get null, feed still loads).
  const user = useStore((state) => {
    return state.auth.currentUser
  })

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortOption>('newest')
  const [category, setCategory] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [totalPages, setTotalPages] = useState(1)

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)

    try {
      const response: ArticlesResponse = await getArticles({
        page,
        limit: 10,
        sort,
        category: category || undefined,
        search: debouncedSearch || undefined,
      })

      if (response.success) {
        setArticles(response.data.articles)
        setTotalPages(response.data.pagination.totalPages)
      } else {
        setError(t('common.errors.loadArticlesFailed'))
      }
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError(translateApiError(err, t('common.errors.loadArticlesFailedRetry')))
    } finally {
      setLoading(false)
    }
  }

  // Reset to first page and refetch when filters change.
  useEffect(() => {
    setPage(1)
    fetchArticles()
  }, [sort, category, debouncedSearch])

  // Refetch when page changes.
  useEffect(() => {
    fetchArticles()
  }, [page])

  // Join the feed room so like/comment counts on visible cards update live,
  // without refetching the whole page.
  useEffect(() => {
    const socket = getSocket()
    socket.emit('feed:join')

    const onStatsUpdated = (payload: { articleId: string; likeCount?: number; commentsCount?: number }) => {
      setArticles((prev) =>
        prev.map((article) => {
          if (article.id !== payload.articleId) {
            return article
          }
          return {
            ...article,
            ...(payload.likeCount !== undefined ? { likeCount: payload.likeCount } : {}),
            ...(payload.commentsCount !== undefined
              ? { _count: { ...article._count, comments: payload.commentsCount } }
              : {}),
          }
        }),
      )
    }

    socket.on('article:stats-updated', onStatsUpdated)

    return () => {
      socket.emit('feed:leave')
      socket.off('article:stats-updated', onStatsUpdated)
    }
  }, [])

  return (
    <div className="space-y-10">
      {/* Hero headline */}
      <section className="grid gap-8 text-center">
        <div className="mx-auto space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{t('home.eyebrow')}</p>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            {t('home.headline')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            {user
              ? t('home.heroUser', { name: user.displayName ?? user.username })
              : t('home.heroGuest')}
          </p>
        </div>

        {!user && (
          <div className="flex justify-center">
            <Button asChild className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <Link to="/login">{t('home.getStarted')}</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Global feed */}
      <section id="global-feed" className="mx-auto w-full max-w-4xl scroll-mt-24 space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{t('home.feedEyebrow')}</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('home.latestArticles')}</h2>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md space-y-4">
          {/* Search */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={SEARCH_MAX_LENGTH}
              className="w-full flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <Link
              to="/search"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-white/70 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:border-purple-300 hover:bg-white"
            >
              {t('home.advancedSearch')}
            </Link>
          </div>

          {/* Sort */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('common.sortBy')}</span>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSort(value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    sort === value
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {t(`common.${SORT_LABEL_KEYS[value]}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">{t('common.category')}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_VALUES.map((value) => (
                <button
                  key={value || 'all'}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === value
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {t(`common.categories.${value || 'ALL'}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Articles list */}
        {loading ? (
          <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
            <p className="text-slate-700">{t('home.loadingArticles')}</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-300/30 bg-red-50/40 p-8 shadow-xl backdrop-blur-md">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => fetchArticles()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
            <p className="text-slate-700">{t('home.noArticles')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white disabled:bg-slate-300 hover:bg-purple-700"
                >
                  {t('common.previous')}
                </button>
                <span className="text-slate-700 font-medium">
                  {t('common.pageOf', { page, totalPages })}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white disabled:bg-slate-300 hover:bg-purple-700"
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
