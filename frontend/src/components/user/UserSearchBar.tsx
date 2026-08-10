import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchUsers, type UserSearchResult } from '@/api/users'
import { getInitials, toSafeImageUrl } from '@/lib/article-display'
import { translateApiError } from '@/lib/api-errors'
import { SearchIcon } from '@/components/ui/icons'

// Username search box for the top nav: type a full or partial username and
// pick a match to jump straight to their profile.
export const UserSearchBar = () => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close the results dropdown on outside clicks.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setHasMore(false)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    searchUsers(debouncedQuery)
      .then((response) => {
        if (!cancelled) {
          setResults(response.users)
          setHasMore(response.hasMore)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(translateApiError(err, err instanceof Error ? err.message : t('userSearch.unableToSearch')))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const closeAndReset = () => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    setHasMore(false)
  }

  const showDropdown = isOpen && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false)
            }
          }}
          placeholder={t('userSearch.placeholder')}
          aria-label={t('userSearch.ariaLabel')}
          className="w-full rounded-full border border-slate-300 bg-white/70 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/30 bg-white/95 shadow-xl backdrop-blur-md">
          {loading ? (
            <p className="px-4 py-3 text-sm text-slate-600">{t('userSearch.searching')}</p>
          ) : error ? (
            <p className="px-4 py-3 text-sm text-red-600">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-600">{t('userSearch.noResults')}</p>
          ) : (
            <>
              <ul>
                {results.map((user) => (
                  <li key={user.id}>
                    <Link
                      to={`/profile/${user.username}`}
                      onClick={closeAndReset}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-900 hover:bg-purple-50"
                    >
                      {toSafeImageUrl(user.avatarUrl) ? (
                        <img
                          src={toSafeImageUrl(user.avatarUrl) ?? undefined}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                          {getInitials(user)}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{user.displayName ?? user.username}</span>
                        <span className="truncate text-xs text-slate-500">@{user.username}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                  {t('userSearch.showingTop', { count: results.length })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
