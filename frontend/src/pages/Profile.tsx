import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProfileArticles, getPublicProfile } from '@/api/users'
import { useStore } from '@/store/store'
import type { ProfileArticle, PublicProfile } from '@/types/profile'

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
const formatDate = (isoDate: string) => {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const Profile = () => {
  // Read :username from route /profile/:username.
  const { username } = useParams<{ username: string }>()

  const currentUser = useStore((state) => {
    return state.auth.currentUser
  })

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')

  const [articles, setArticles] = useState<ProfileArticle[]>([])
  const [isLoadingArticles, setIsLoadingArticles] = useState(true)
  const [articlesError, setArticlesError] = useState('')
  const [articlesUnavailable, setArticlesUnavailable] = useState(false)

  useEffect(() => {
      // Load profile data when username changes.
      const normalizedUsername = username?.trim()

      if (!normalizedUsername) {
        setProfile(null)
        setIsLoadingProfile(false)
        setProfileError('Profile username is missing')
        return
      }

      let ignore = false

      const loadProfile = async () => {
        setIsLoadingProfile(true)
        setProfileError('')

        try {
          const loadedProfile = await getPublicProfile(normalizedUsername)

          if (!ignore) {
            setProfile(loadedProfile)
          }
        } catch (error) {
          if (!ignore) {
            if (error instanceof Error) {
              setProfileError(error.message)
            } else {
              setProfileError('Unable to load profile')
            }
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
        setArticlesError('')
        setArticlesUnavailable(false)
        return
      }

      let ignore = false

      const loadArticles = async () => {
        setIsLoadingArticles(true)
        setArticlesError('')
        setArticlesUnavailable(false)

        try {
          const result = await getProfileArticles(normalizedUsername)

          if (!ignore) {
            setArticles(result.items)
            setArticlesUnavailable(result.isUnavailable)
          }
        } catch (error) {
          if (!ignore) {
            if (error instanceof Error) {
              setArticlesError(error.message)
            } else {
              setArticlesError('Unable to load articles')
            }
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

  // Show this while profile data is still loading.
  if (isLoadingProfile) {
    return (
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Profile</p>
        <p className="mt-4 text-slate-700">Loading profile...</p>
      </section>
    )
  }

  // Show this if loading failed or profile was not found.
  if (profileError.length > 0 || !profile) {
    return (
      <section className="mx-auto w-full max-w-5xl rounded-2xl border border-red-200/50 bg-red-50/80 p-8 shadow-xl backdrop-blur-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Profile</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Unable to load profile</h1>
        <p className="mt-2 text-slate-700">{profileError || 'This profile does not exist or is currently unavailable.'}</p>
      </section>
    )
  }

  // Build safe avatar URL and pick the best display name.
  const avatarUrl = toSafeImageUrl(profile.avatarUrl)
  const displayName = profile.displayName ?? profile.username

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-100/30 via-transparent to-cyan-100/30" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar image or initials if no image. */}
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${displayName} avatar`} className="h-full w-full object-cover" />
              ) : (
                <span>{getInitials(profile)}</span>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Profile</p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-900">{displayName}</h1>
              <p className="text-slate-600">@{profile.username}</p>
            </div>
          </div>

          {/* Only show Edit button on your own profile. */}
          {isOwnProfile ? (
            <button
              type="button"
              className="rounded-full border border-purple-200 bg-white/70 px-5 py-2 text-sm font-semibold text-purple-700 transition-all hover:border-purple-300 hover:bg-white"
              title="Profile editing flow is coming soon"
            >
              Edit Profile
            </button>
          ) : null}
        </div>

        {/* Bio text or a default message if empty. */}
        <p className="relative mt-6 text-slate-700">
          {profile.bio ?? 'No bio yet. This user has not added a profile bio.'}
        </p>

        {/* Stats row: articles, followers, following, level, experience. */}
        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Articles</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{profile.articleCount}</p>
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Followers</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{profile.followerCount}</p>
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Following</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{profile.followingCount}</p>
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Level</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{profile.level}</p>
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{profile.experiencePoints}</p>
          </div>
        </div>
      </div>

      {/* Badges section. */}
      <div className="rounded-3xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Badges</h2>
          <span className="text-sm font-semibold text-slate-500">{profile.badges.length} collected</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {profile.badges.length > 0 ? (
            profile.badges.map((badge) => {
              return (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-purple-50 px-4 py-2 text-sm font-semibold text-fuchsia-800"
                >
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </span>
              )
            })
          ) : (
            <p className="text-slate-600">No badges unlocked yet.</p>
          )}
        </div>
      </div>

      {/* Articles section. */}
      <div className="rounded-3xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">Articles</h2>
          <span className="text-sm font-semibold text-slate-500">{articles.length} shown</span>
        </div>

        {/* Still loading. */}
        {isLoadingArticles ? <p className="mt-5 text-slate-700">Loading articles...</p> : null}

        {/* Loading failed. */}
        {!isLoadingArticles && articlesError.length > 0 ? (
          <p className="mt-5 rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
            {articlesError}
          </p>
        ) : null}

        {/* Backend endpoint not ready yet — show soft message instead of error. */}
        {!isLoadingArticles && articlesError.length === 0 && articlesUnavailable ? (
          <p className="mt-5 rounded-lg border border-blue-200/50 bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-700">
            Article listing endpoint is not available yet. This section is ready and will auto-render once the API is added.
          </p>
        ) : null}

        {/* No articles written yet. */}
        {!isLoadingArticles && articlesError.length === 0 && !articlesUnavailable && articles.length === 0 ? (
          <p className="mt-5 text-slate-600">No published articles yet.</p>
        ) : null}

        {/* Article list. */}
        {!isLoadingArticles && articles.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {articles.map((article) => {
              return (
                <li key={article.id} className="rounded-2xl border border-white/50 bg-white/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{article.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{article.category}</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      <p>{formatDate(article.createdAt)}</p>
                      <p>{article.likeCount} likes</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="mt-6">
          <Link to="/feed" className="text-sm font-semibold text-purple-700 hover:text-purple-900">
            Back to Feed
          </Link>
        </div>
      </div>
    </section>
  )
}