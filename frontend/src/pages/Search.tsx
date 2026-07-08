import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArticleCard } from '@/components/ArticleCard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getArticles, type Article, type ArticlesResponse } from '@/api/articles'

type SortOption = 'newest' | 'oldest' | 'most_liked'

const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'most_liked']

const CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'PROGRAMMING', label: 'Programming' },
  { value: 'CAREER', label: 'Career' },
  { value: 'STUDY_NOTES', label: 'Study Notes' },
  { value: 'PROJECTS', label: 'Projects' },
  { value: 'LIFE', label: 'Life' },
  { value: 'OPINION', label: 'Opinion' },
]

interface FieldFilters {
  title: string
  author: string
  content: string
  postedFrom: string
  postedTo: string
}

const EMPTY_FIELDS: FieldFilters = { title: '', author: '', content: '', postedFrom: '', postedTo: '' }

const readFieldFilters = (params: URLSearchParams): FieldFilters => ({
  title: params.get('title') ?? '',
  author: params.get('author') ?? '',
  content: params.get('content') ?? '',
  postedFrom: params.get('postedFrom') ?? '',
  postedTo: params.get('postedTo') ?? '',
})

// This is the structured counterpart to Home's "search everything" bar:
// separate fields (title/author/content/date range) that are ANDed
// together, for narrowing down results precisely rather than a broad match.
export const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [fields, setFields] = useState<FieldFilters>(() => readFieldFilters(searchParams))
  const debouncedFields = useDebouncedValue(fields, 400)

  const [category, setCategory] = useState(() => searchParams.get('category') ?? '')
  const [sort, setSort] = useState<SortOption>(() => {
    const raw = searchParams.get('sort')
    return SORT_OPTIONS.includes(raw as SortOption) ? (raw as SortOption) : 'newest'
  })
  const [page, setPage] = useState(() => {
    const raw = parseInt(searchParams.get('page') ?? '1', 10)
    return Number.isFinite(raw) && raw > 0 ? raw : 1
  })

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)

  const updateField = (key: keyof FieldFilters, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const fetchArticles = async (pageToFetch: number) => {
    setLoading(true)
    setError(null)

    try {
      const response: ArticlesResponse = await getArticles({
        page: pageToFetch,
        limit: 10,
        sort,
        category: category || undefined,
        title: debouncedFields.title || undefined,
        author: debouncedFields.author || undefined,
        content: debouncedFields.content || undefined,
        // Widen a plain date-picker value ("2026-07-07") to cover the whole day.
        postedFrom: debouncedFields.postedFrom ? `${debouncedFields.postedFrom}T00:00:00.000` : undefined,
        postedTo: debouncedFields.postedTo ? `${debouncedFields.postedTo}T23:59:59.999` : undefined,
      })

      if (response.success) {
        setArticles(response.data.articles)
        setTotalPages(response.data.pagination.totalPages)
      } else {
        setError('Failed to load articles')
      }
    } catch (err) {
      console.error('Error searching articles:', err)
      setError('Failed to load articles. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Each effect below tracks its own "have I run once" flag rather than
  // sharing one, so a deep link like /search?author=alice&page=2 fetches
  // page 2 exactly once on mount instead of being reset back to page 1.
  const skipFilterResetOnMount = useRef(true)
  const skipPageFetchOnMount = useRef(true)

  // Reset to first page and refetch when filters change; on the initial
  // mount, skip the reset and just fetch whatever page came from the URL.
  useEffect(() => {
    if (skipFilterResetOnMount.current) {
      skipFilterResetOnMount.current = false
      fetchArticles(page)
      return
    }
    setPage(1)
    fetchArticles(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFields, category, sort])

  // Refetch when the page changes directly (Previous/Next clicks).
  useEffect(() => {
    if (skipPageFetchOnMount.current) {
      skipPageFetchOnMount.current = false
      return
    }
    fetchArticles(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Keep the URL in sync with the current filters so this search can be
  // bookmarked or shared. Uses `replace` so typing doesn't spam history.
  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedFields.title) params.title = debouncedFields.title
    if (debouncedFields.author) params.author = debouncedFields.author
    if (debouncedFields.content) params.content = debouncedFields.content
    if (debouncedFields.postedFrom) params.postedFrom = debouncedFields.postedFrom
    if (debouncedFields.postedTo) params.postedTo = debouncedFields.postedTo
    if (category) params.category = category
    if (sort !== 'newest') params.sort = sort
    if (page !== 1) params.page = String(page)
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFields, category, sort, page])

  const hasAnyFilterInput =
    fields.title !== EMPTY_FIELDS.title ||
    fields.author !== EMPTY_FIELDS.author ||
    fields.content !== EMPTY_FIELDS.content ||
    fields.postedFrom !== EMPTY_FIELDS.postedFrom ||
    fields.postedTo !== EMPTY_FIELDS.postedTo ||
    category !== ''

  const clearFilters = () => {
    setFields(EMPTY_FIELDS)
    setCategory('')
    setSort('newest')
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Advanced Search</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Find Articles by Field</h1>
        <p className="text-slate-600">Narrow results by title, author, content, or when it was posted.</p>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-2xl border border-white/30 bg-white/40 p-6 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-title" className="mb-2 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="field-title"
              type="text"
              placeholder="e.g. Getting started"
              value={fields.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="field-author" className="mb-2 block text-sm font-medium text-slate-700">
              Author
            </label>
            <input
              id="field-author"
              type="text"
              placeholder="e.g. alice"
              value={fields.author}
              onChange={(e) => updateField('author', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="field-content" className="mb-2 block text-sm font-medium text-slate-700">
            Content
          </label>
          <input
            id="field-content"
            type="text"
            placeholder="Words that appear in the article body"
            value={fields.content}
            onChange={(e) => updateField('content', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-posted-from" className="mb-2 block text-sm font-medium text-slate-700">
              Posted after
            </label>
            <input
              id="field-posted-from"
              type="date"
              value={fields.postedFrom}
              onChange={(e) => updateField('postedFrom', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="field-posted-to" className="mb-2 block text-sm font-medium text-slate-700">
              Posted before
            </label>
            <input
              id="field-posted-to"
              type="date"
              value={fields.postedTo}
              onChange={(e) => updateField('postedTo', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="search-sort-select" className="mb-2 block text-sm font-medium text-slate-700">
              Sort by
            </label>
            <select
              id="search-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_liked">Most Liked</option>
            </select>
          </div>

          <div>
            <label htmlFor="search-category-select" className="mb-2 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              id="search-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value || 'all'} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasAnyFilterInput && (
          <div className="text-right">
            <button onClick={clearFilters} className="text-sm font-medium text-purple-600 hover:text-purple-700">
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 text-center shadow-xl backdrop-blur-md">
          <p className="text-slate-700">Searching...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-300/30 bg-red-50/40 p-8 shadow-xl backdrop-blur-md">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchArticles(page)}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 text-center shadow-xl backdrop-blur-md">
          <p className="text-slate-700">No articles match your filters. Try adjusting the fields above.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:bg-slate-300"
              >
                Previous
              </button>
              <span className="font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:bg-slate-300"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
