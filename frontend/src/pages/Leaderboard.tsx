import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLeaderboard } from '@/api/leaderboard'
import { PageEyebrow } from '@/components/ui/page-eyebrow'
import { translateApiError } from '@/lib/api-errors'
import { getInitials, toSafeImageUrl } from '@/lib/article-display'
import { useAuth } from '@/hooks/useAuth'
import type { LeaderboardUser } from '@/types/leaderboard'
import { getRankFrameClass } from '@/lib/rank-frame'

const rankClass = (rank: number) => {
  if (rank === 1) return 'text-amber-500'
  if (rank === 2) return 'text-slate-400'
  if (rank === 3) return 'text-orange-600'
  return 'text-slate-600'
}

export const Leaderboard = () => {
  const { t } = useTranslation()
  const { currentUser, hasRestoredSession } = useAuth({ restoreOnMount: true })
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLeaderboard = async () => {
    setIsLoading(true)
    setError('')

    try {
      setUsers(await getLeaderboard())
    } catch (loadError) {
      setError(loadError instanceof Error
        ? translateApiError(loadError, loadError.message)
        : t('leaderboard.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLeaderboard()
  }, [])

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <header className="text-center">
        <PageEyebrow>
          {t('leaderboard.eyebrow')}
        </PageEyebrow>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t('leaderboard.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          {t('leaderboard.description')}
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 text-center shadow-xl backdrop-blur-md">
          <p className="text-slate-700">{t('leaderboard.loading')}</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-300/30 bg-red-50/60 p-8 text-center shadow-xl backdrop-blur-md">
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadLeaderboard()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 text-center shadow-xl backdrop-blur-md">
          <p className="text-slate-700">{t('leaderboard.empty')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/50 shadow-xl backdrop-blur-md">
          <div className="divide-y divide-slate-200/70 md:hidden">
            {users.map((user, index) => {
              const rank = user.rank ?? index + 1
              const isCurrentUser = hasRestoredSession && currentUser?.id === user.id
              const avatarUrl = toSafeImageUrl(user.avatarUrl)
              const displayName = user.displayName ?? user.username

              return (
                <article
                  key={user.id}
                  className={`p-4 ${isCurrentUser ? 'bg-purple-200/100' : 'transition-colors hover:bg-purple-100/70'}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 shrink-0 text-center text-lg font-bold ${rankClass(rank)}`}
                      aria-label={t('leaderboard.rankLabel', { rank })}
                    >
                      {rank}
                    </span>
                    <Link to={`/profile/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white ${getRankFrameClass(rank)}`}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden="true">{getInitials(user)}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{displayName}</span>
                        <span className="block truncate text-sm text-slate-500">@{user.username}</span>
                      </span>
                      {isCurrentUser ? (
                        <span className="shrink-0 rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                          {t('leaderboard.you')}
                        </span>
                      ) : null}
                    </Link>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 pl-11 text-center text-xs">
                    <div className="rounded-lg bg-amber-100 px-2 py-2">
                      <p className="text-slate-500">{t('leaderboard.level')}</p>
                      <p className="mt-1 font-semibold text-amber-800">{user.level}</p>
                    </div>
                    <div className="rounded-lg bg-white/60 px-2 py-2">
                      <p className="text-slate-500">{t('leaderboard.likes')}</p>
                      <p className="mt-1 font-semibold text-slate-700">{user.totalLikes}</p>
                    </div>
                    <div className="rounded-lg bg-white/60 px-2 py-2">
                      <p className="text-slate-500">{t('leaderboard.articles')}</p>
                      <p className="mt-1 font-semibold text-slate-700">{user.articleCount}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] table-fixed text-left">
              <caption className="sr-only">{t('leaderboard.title')}</caption>
              <colgroup>
                <col className="w-20" />
                <col />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
              </colgroup>
              <thead className="border-b border-slate-200/80 bg-white/50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-4">{t('leaderboard.rank')}</th>
                  <th scope="col" className="px-5 py-4">{t('leaderboard.user')}</th>
                  <th scope="col" className="px-5 py-4">{t('leaderboard.level')}</th>
                  <th scope="col" className="px-5 py-4 text-right">{t('leaderboard.likes')}</th>
                  <th scope="col" className="px-5 py-4 text-right">{t('leaderboard.articles')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {users.map((user, index) => {
                  const rank = user.rank ?? index + 1
                  const isCurrentUser = hasRestoredSession && currentUser?.id === user.id
                  const avatarUrl = toSafeImageUrl(user.avatarUrl)
                  const displayName = user.displayName ?? user.username

                  return (
                    <tr
                      key={user.id}
                      className={isCurrentUser
                        ? 'bg-purple-200/100'
                        : 'transition-colors hover:bg-purple-100/70'}
                    >
                      <td className={`px-5 py-4 text-lg font-bold ${rankClass(rank)}`}>
                        <span aria-label={t('leaderboard.rankLabel', { rank })}>{rank}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/profile/${user.username}`}
                          className="flex w-full min-w-0 items-center gap-3"
                        >
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white ${getRankFrameClass(rank)}`}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span aria-hidden="true">{getInitials(user)}</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-slate-900">{displayName}</span>
                            <span className="block truncate text-sm text-slate-500">@{user.username}</span>
                          </span>
                          {isCurrentUser ? (
                            <span className="shrink-0 rounded-full bg-purple-600 px-2 py-1 text-xs font-semibold text-white">
                              {t('leaderboard.you')}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                          {t('leaderboard.levelBadge', { level: user.level })}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700">{user.totalLikes}</td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700">{user.articleCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}