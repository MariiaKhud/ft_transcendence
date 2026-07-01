import { useEffect, useState } from 'react'
import { useStore } from '@/store/store'
import { getArticles, type Article, type ArticlesResponse } from '@/api/articles'

export const Feed = () => {
  // Read current user from global store.
  const user = useStore((state) => {
    return state.auth.currentUser
  })

  // Feed state
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<'newest' | 'oldest' | 'most_liked'>('newest')
  const [category, setCategory] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [totalPages, setTotalPages] = useState(1)

  // Fetch articles
  const fetchArticles = async () => {
    setLoading(true)
    setError(null)

    try {
      const response: ArticlesResponse = await getArticles({
        page,
        limit: 20,
        sort,
        category: category || undefined,
        search: search || undefined,
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

  // Fetch articles when filters change
  useEffect(() => {
    setPage(1) // Reset to first page when filters change
    fetchArticles()
  }, [sort, category, search])

  // Fetch articles when page changes
  useEffect(() => {
    fetchArticles()
  }, [page])

  const handleSortChange = (newSort: 'newest' | 'oldest' | 'most_liked') => {
    setSort(newSort)
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Feed header */}
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Global Feed</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Welcome to Feed</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          {user
            ? `Hello ${user.displayName ?? user.username}, discover the latest activity from your network.`
            : 'Discover the latest activity from your network.'}
        </p>
      </div>

      {/* Filters section */}
      <div className="rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Sort and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Sort by</label>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              value={category}
              onChange={handleCategoryChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="PROGRAMMING">Programming</option>
              <option value="CAREER">Career</option>
              <option value="STUDY_NOTES">Study Notes</option>
              <option value="PROJECTS">Projects</option>
              <option value="LIFE">Life</option>
              <option value="OPINION">Opinion</option>
            </select>
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
          <p className="text-slate-700">No articles found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {articles.map((article) => (
              <article
                key={article.id}
                className="rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md hover:shadow-2xl transition-shadow"
              >
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
  )
}
