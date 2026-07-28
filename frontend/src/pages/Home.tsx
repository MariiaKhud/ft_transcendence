import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArticleCard } from '@/components/ArticleCard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useStore } from '@/store/store'
import { getArticles, type Article, type ArticlesResponse } from '@/api/articles'

type SortOption = 'newest' | 'oldest' | 'most_liked'

const CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PROGRAMMING', label: 'Programming' },
  { value: 'CAREER', label: 'Career' },
  { value: 'STUDY_NOTES', label: 'Study Notes' },
  { value: 'PROJECTS', label: 'Projects' },
  { value: 'LIFE', label: 'Life' },
  { value: 'OPINION', label: 'Opinion' },
]

export const Home = () => {
  // Read current user from global store (guests get null, feed still loads).
  // throw new Error('TEMP_TEST_ERROR')  // Comment this out to test 500 error page
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
        setError('Failed to load articles')
      }
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError('Failed to load articles. Please try again.')
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

  return (
    <div className="space-y-16">
      {/* Hero headline */}
      <section className="grid gap-8 text-center">
        <div className="mx-auto space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Welcome</p>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Connect. Share. Grow.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            {user
              ? `Hello ${user.displayName ?? user.username}, discover the latest activity from your network.`
              : 'A transcendent experience built with modern web technologies and designed for the future.'}
          </p>
        </div>

        {!user && (
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <Link to="/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-2 border-purple-300 px-8 py-3 text-base font-semibold hover:bg-purple-50">
              <a href="#global-feed">Browse Articles</a>
            </Button>
          </div>
        )}
      </section>

      {/* Global feed */}
      <section id="global-feed" className="mx-auto w-full max-w-4xl scroll-mt-24 space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Global Feed</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Latest Articles</h2>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md space-y-4">
          {/* Search */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
            <Link
              to="/search"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-white/70 px-4 py-2 text-sm font-medium text-purple-700 transition-all hover:border-purple-300 hover:bg-white"
            >
              Advanced Search
            </Link>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="sort-select" className="block text-sm font-medium text-slate-700 mb-2">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none sm:w-auto"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>

          {/* Category pills */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value || 'all'}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {cat.label === 'All' ? 'All Categories' : cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Articles list */}
        {loading ? (
          <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
            <p className="text-slate-700">Loading articles...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-300/30 bg-red-50/40 p-8 shadow-xl backdrop-blur-md">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => fetchArticles()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
            <p className="text-slate-700">No articles found. Try a different category.</p>
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
                  Previous
                </button>
                <span className="text-slate-700 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white disabled:bg-slate-300 hover:bg-purple-700"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
