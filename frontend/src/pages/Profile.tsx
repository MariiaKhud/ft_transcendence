import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getProfileArticles, getPublicProfile } from '@/api/users'
import { translateApiError } from '@/lib/api-errors'
import { useStore } from '@/store/store'
import type { ProfileArticle, PublicProfile } from '@/types/profile'
import { FriendButton } from '@/components/user/FriendButton'
import { FollowButton } from '@/components/user/FollowButton'
import { MessageButtonLink } from '../components/user/MessageButtonLink'
import type { FriendshipState } from '@shared/types/friendship'
import { getFriendshipStatus } from '../api/friends';
import { XPBar } from '@/components/gamification/XPBar'
import { BadgeList } from '@/components/gamification/BadgeList'

// Convert relative avatar path to full URL for browser image tag.
const toSafeImageUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) {
    return null
  }

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl
  }

  return `${window.location.origin}${avatarUrl}`
}

// Create initials when user has no avatar image.
const getInitials = (profile: PublicProfile) => {
  const source = (profile.displayName ?? profile.username).trim()
  const parts = source.split(/\s+/).filter(Boolean)

  // return "U" for unknown if no name parts are available.
  if (parts.length === 0) {
    return 'U'
  }

  // return first two letters of first name if only one part is available.
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

// Show readable date like "Jun 25, 2026".
const formatDate = (isoDate: string, unknownDateLabel: string) => {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return unknownDateLabel
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const Profile = () => {
  const { t } = useTranslation()
  // Read :username from route /profile/:username.
  const { username } = useParams<{ username: string }>()

  const currentUser = useStore((state) => {
    return state.auth.currentUser
  })

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<unknown | null>(null)

  const [articles, setArticles] = useState<ProfileArticle[]>([])
  const [isLoadingArticles, setIsLoadingArticles] = useState(true)
  const [articlesError, setArticlesError] = useState<unknown | null>(null)
  const [articlesUnavailable, setArticlesUnavailable] = useState(false)

  useEffect(() => {
      // Load profile data when username changes.
      const normalizedUsername = username?.trim()

      if (!normalizedUsername) {
        setProfile(null)
        setIsLoadingProfile(false)
        setProfileError(null)
        return
      }

      let ignore = false

      const loadProfile = async () => {
        setIsLoadingProfile(true)
        setProfileError(null)

        try {
          const loadedProfile = await getPublicProfile(normalizedUsername)

          if (!ignore) {
            setProfile(loadedProfile)
            setFollowerCount(loadedProfile.followerCount)
          }
        } catch (error) {
          if (!ignore) {
            setProfileError(error ?? null)
            setProfile(null)
          }
        } finally {
          if (!ignore) {
            setIsLoadingProfile(false)
          }
        }
      }

      void loadProfile()

      return () => {
        // Ignore old request result when component unmounts.
        ignore = true
      }
    },
    [username],
  )

  useEffect(() => {
      // Load profile article list when username changes.
      const normalizedUsername = username?.trim()

      if (!normalizedUsername) {
        setArticles([])
        setIsLoadingArticles(false)
        setArticlesError(null)
        setArticlesUnavailable(false)
        return
      }

      let ignore = false

      const loadArticles = async () => {
        setIsLoadingArticles(true)
        setArticlesError(null)
        setArticlesUnavailable(false)

        try {
          const result = await getProfileArticles(normalizedUsername)

          if (!ignore) {
            setArticles(result.items)
            setArticlesUnavailable(result.isUnavailable)
          }
        } catch (error) {
          if (!ignore) {
            setArticlesError(error ?? null)
            setArticles([])
          }
        } finally {
          if (!ignore) {
            setIsLoadingArticles(false)
          }
        }
      }

      void loadArticles()

      return () => {
        // Ignore old request result when component unmounts.
        ignore = true
      }
    },
    [username],
  )

  // Show Edit button only on your own profile.
  const isOwnProfile = useMemo(() => {
    if (!profile || !currentUser) {
      return false
    }

    return currentUser.username.toLowerCase() === profile.username.toLowerCase()
  }, [currentUser, profile])

  const [friendshipState, setFriendshipState] = useState<FriendshipState>('none')

  useEffect(() => {
    if (!profile) {
      return
    }

    if (!currentUser || currentUser.id === profile.id) {
      setFriendshipState('self')
      return
    }

    getFriendshipStatus(profile.id)
      .then((res) => setFriendshipState(res.state))
      .catch(() => setFriendshipState('none'))
  }, [profile, currentUser])

  const resolvedProfileError = profileError
    ? translateApiError(profileError, t('profile.unableToLoad'))
    : null

  const resolvedArticlesError = articlesError
    ? translateApiError(articlesError, t('profile.articlesUnableToLoad'))
    : null

  const isMissingUsername = !username?.trim()

  // Show this while profile data is still loading.
  if (isLoadingProfile) {
    return (
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{t('profile.eyebrow')}</p>
        <p className="mt-4 text-slate-700">{t('profile.loading')}</p>
      </section>
    )
  }

  // Show this if loading failed or profile was not found.
  if (isMissingUsername) {
    return (
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-red-200/50 bg-purple-50 p-8 shadow-xl backdrop-blur-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{t('profile.eyebrow')}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{t('profile.unableToLoad')}</h1>
        <p className="mt-2 text-slate-700">{t('profile.usernameMissing')}</p>
      </section>
    )
  }

  if (resolvedProfileError || !profile) {
    return (
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-red-200/50 bg-purple-50 p-8 shadow-xl backdrop-blur-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{t('profile.eyebrow')}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{t('profile.unableToLoad')}</h1>
        <p className="mt-2 text-slate-700">{resolvedProfileError || t('profile.unavailable')}</p>
      </section>
    )
  }

  // Build safe avatar URL and pick the best display name.
  // For own profile, prefer the store's avatarUrl — it is updated immediately
  // after an upload without waiting for a re-fetch of the public profile.
  const resolvedAvatarUrl = isOwnProfile && currentUser ? currentUser.avatarUrl : profile.avatarUrl
  const avatarUrl = toSafeImageUrl(resolvedAvatarUrl)
  const displayName = profile.displayName ?? profile.username

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-100/30 via-transparent to-cyan-100/30" />

        <div className="relative flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            {/* Avatar image or initials if no image. */}
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${displayName} avatar`} className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials(profile)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">{t('profile.eyebrow')}</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">{displayName}</h1>
              <p className="break-words text-slate-600">@{profile.username}</p>
            </div>
          </div>

          {!isOwnProfile ? (
            <div className="flex flex-col items-end gap-2">
              <FollowButton
                targetUserId={profile.id}
                onFollowChange={(isFollowing) => {
                  setFollowerCount((prev) => (isFollowing ? prev + 1 : prev - 1))
                }}
              />

              <FriendButton
                targetUserId={profile.id}
                initialState={friendshipState}
                onStateChange={setFriendshipState}
              />

              {friendshipState === 'friends' ? (
                <MessageButtonLink username={profile.username} />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Bio text or a default message if empty. */}
        <p className="relative mt-6 break-words whitespace-pre-wrap text-slate-700">
          {profile.bio ?? t('profile.noBio')}
        </p>

        {profile.cvUrl && profile.cvFilename ? (
          <a
            href={profile.cvUrl}
            download={profile.cvFilename}
            className="relative mt-5 inline-flex items-center rounded-lg border border-purple-200 bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:border-purple-300 hover:bg-white"
          >
            {t('profile.downloadCv')}
          </a>
        ) : null}

        {/* Stats row: articles, followers, following */}
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('profile.statArticles')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {profile.articleCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('profile.statFollowers')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {followerCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('profile.statFollowing')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {profile.followingCount}
            </p>
          </div>
        </div>

        {/* Progress and badges */}
        <div className="relative mt-6 grid items-stretch gap-3 sm:grid-cols-2">
          {/* XP Bar */}
          <div className="h-full">
            <XPBar
              level={profile.level}
              experiencePoints={profile.experiencePoints}
              className="h-full"
            />
          </div>

          {/* Badges section */}
          <div className="flex h-full flex-col rounded-2xl border border-white/50 bg-white/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('profile.badges')}
              </p>

              <span className="text-xs font-semibold uppercase text-purple-600">
                {t('profile.badgesCollected', {
                  count: profile.badges.length,
                })}
              </span>
            </div>

            <div className="mt-3 flex-1">
              <BadgeList badges={profile.badges} />
            </div>
          </div>
        </div>
      </div>

      {/* Articles section. */}
      <div className="rounded-3xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{t('profile.articlesHeading')}</h2>
          <span className="text-sm font-semibold text-slate-500">{t('profile.articlesShown', { count: articles.length })}</span>
        </div>

        {/* Still loading. */}
        {isLoadingArticles ? <p className="mt-5 text-slate-700">{t('profile.loadingArticles')}</p> : null}

        {/* Loading failed. */}
        {!isLoadingArticles && resolvedArticlesError ? (
          <p className="mt-5 rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
            {resolvedArticlesError}
          </p>
        ) : null}

        {/* Backend endpoint not ready yet — show soft message instead of error. */}
        {!isLoadingArticles && !resolvedArticlesError && articlesUnavailable ? (
          <p className="mt-5 rounded-lg border border-blue-200/50 bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-700">
            {t('profile.articlesUnavailable')}
          </p>
        ) : null}

        {/* No articles written yet. */}
        {!isLoadingArticles && !resolvedArticlesError && !articlesUnavailable && articles.length === 0 ? (
          <p className="mt-5 text-slate-600">{t('profile.noArticlesYet')}</p>
        ) : null}

        {/* Article list. */}
        {!isLoadingArticles && articles.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {articles.map((article) => {
              return (
                <li
                  key={article.id}
                  className="relative rounded-2xl border border-white/50 bg-white/60 p-4 transition-shadow hover:shadow-lg"
                >
                  <Link to={`/articles/${article.id}`} className="absolute inset-0" aria-label={article.title} />
                  <div className="pointer-events-none flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-slate-900">{article.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{article.category}</p>
                    </div>
                    <div className="shrink-0 text-sm text-slate-500">
                      <p>{formatDate(article.createdAt, t('profile.unknownDate'))}</p>
                      <p>{t('profile.likes', { count: article.likeCount })}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="mt-6">
          <Link to="/" className="text-sm font-semibold text-purple-700 hover:text-purple-900">
            {t('common.backToFeed')}
          </Link>
        </div>
      </div>
    </section>
  )
}
