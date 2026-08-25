import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFriends, getIncomingRequests, respondToFriendRequest } from '@/api/friends'
import { FriendButton } from '@/components/user/FriendButton'
import { MessageButtonLink } from '../components/user/MessageButtonLink'
import { UserAvatar } from '@/components/user/UserAvatar'
import { Button } from '@/components/ui/button'
import { CheckIcon, XIcon, Spinner, UserPlusIcon } from '@/components/ui/icons'
import { formatLastSeen } from '@/lib/utils'
import type { Friend, IncomingRequest } from '@/types/friends'

// ─── Page ─────────────────────────────────────────────────────

export function Friends() {
  const { t } = useTranslation()
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<IncomingRequest[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFriends()
      .then((res) => setFriends(res.data ?? []))
      .catch(() => setError(t('friends.loadError')))
      .finally(() => setLoadingFriends(false))

    getIncomingRequests()
      .then((res) => setRequests(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingRequests(false))
  }, [t])

  function handleAccepted(friendshipId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== friendshipId))
    // Reload friends list so the new friend appears
    getFriends()
      .then((res) => setFriends(res.data ?? []))
      .catch(() => {})
  }

  function handleDeclined(friendshipId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== friendshipId))
  }

  function handleFriendRemoved(friendId: string) {
    setFriends((prev) => prev.filter((f) => f.id !== friendId))
  }

  return (
    <div className="mx-auto
                    max-w-4xl
                    space-y-10">

      {error && (
        <div className="rounded-2xl
                        border
                        border-pink-200/50
                        bg-pink-50
                        p-4
                        text-sm
                        text-pink-600
                        backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* ── Incoming Requests ─────────────────────────────── */}
      {(loadingRequests || requests.length > 0) && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p className="text-sm
                          font-semibold
                          uppercase
                          tracking-[0.15em]
                          text-purple-600">
              {t('friends.requestsTitle')}
            </p>
            {requests.length > 0 && (
              <span className="rounded-full
                              bg-pink-100
                              px-2 py-0.5
                              text-xs
                              font-bold
                              text-pink-600">
                {requests.length}
              </span>
            )}
          </div>

          {loadingRequests ? (
            <RequestsSkeleton />
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onAccepted={() => handleAccepted(req.id)}
                  onDeclined={() => handleDeclined(req.id)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Friends List ──────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <p className="text-sm
                        font-semibold
                        uppercase
                        tracking-[0.15em]
                        text-purple-600">
            {t('friends.title')}
          </p>
          {friends.length > 0 && (
            <span className="text-sm font-normal text-slate-500">
              {friends.length}
            </span>
          )}
        </div>

        {loadingFriends ? (
          <FriendsSkeleton />
        ) : friends.length === 0 ? (
          <EmptyFriends />
        ) : (
          <ul className="space-y-3">
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onRemoved={() => handleFriendRemoved(friend.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ─── RequestCard ──────────────────────────────────────────────

function RequestCard({
  request,
  onAccepted,
  onDeclined,
}: {
  request: IncomingRequest
  onAccepted: () => void
  onDeclined: () => void
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      await respondToFriendRequest(request.requester.id, 'ACCEPTED')
      onAccepted()
    } catch {
      setError(t('friends.acceptError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    setLoading(true)
    setError(null)
    try {
      await respondToFriendRequest(request.requester.id, 'DECLINED')
      onDeclined()
    } catch {
      setError(t('friends.declineError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <li className="rounded-2xl
                  border
                  border-white/30
                  bg-white/40
                  p-4
                  shadow-sm
                  backdrop-blur-sm">
      <div className="flex
                      items-center
                      justify-between
                      gap-4">
        <Link
          to={`/profile/${request.requester.username}`}
          className="flex
                    min-w-0
                    items-center
                    gap-3
                    hover:opacity-80
                    transition-opacity"
        >
          <UserAvatar
            avatarUrl={request.requester.avatarUrl}
            username={request.requester.username}
          />
          <div className="min-w-0">
            <p className="truncate
                          font-semibold
                          text-slate-900">
              {request.requester.displayName ?? request.requester.username}
            </p>
            <p className="truncate
                          text-sm
                          text-slate-500">
              @{request.requester.username}
            </p>
          </div>
        </Link>

        <div className="flex
                        shrink-0
                        items-center
                        gap-2">
          <Button
            variant="profileSuccess"
            disabled={loading}
            onClick={handleAccept}
            aria-label={t('friendButton.acceptAria')}
          >
            {loading ? <Spinner /> : <CheckIcon />}
            {t('friendButton.accept')}
          </Button>
          <Button
            variant="profileSecondary"
            disabled={loading}
            onClick={handleDecline}
            aria-label={t('friendButton.declineAria')}
          >
            <XIcon />
            {t('friendButton.decline')}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-2
                      text-xs
                      text-pink-600">{error}</p>
      )}
    </li>
  )
}

// ─── FriendCard ───────────────────────────────────────────────

function FriendCard({
  friend,
  onRemoved,
}: {
  friend: Friend
  onRemoved: () => void
}) {
  const { t } = useTranslation()

  return (
    <li className="rounded-2xl
                   border
                   border-white/30
                   bg-white/40
                   p-4
                   shadow-sm
                   backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <Link
          to={`/profile/${friend.username}`}
          className="flex
                     min-w-0
                     items-center
                     gap-3
                     hover:opacity-80
                     transition-opacity"
        >
          {/* Avatar with online indicator */}
          <div className="relative shrink-0">
            <UserAvatar
              avatarUrl={friend.avatarUrl}
              username={friend.username}
            />
            <span
              className={`absolute
                          bottom-0
                          right-0
                          h-3
                          w-3
                          rounded-full
                          border-2
                          border-white ${
                friend.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={
                friend.isOnline
                  ? t('friends.online')
                  : t('friends.lastSeen', { time: formatLastSeen(friend.lastSeenAt) })
              }
              aria-label={
                friend.isOnline
                  ? t('friends.online')
                  : t('friends.lastSeen', { time: formatLastSeen(friend.lastSeenAt) })
              }
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-slate-900">
                {friend.displayName ?? friend.username}
              </p>
              {friend.isOnline && (
                <span className="shrink-0
                                 text-xs
                                 font-medium
                                 text-emerald-600">
                  ● {t('friends.online')}
                </span>
              )}
            </div>
            <p className="truncate
                          text-sm
                          text-slate-500">
              @{friend.username}
            </p>
          </div>
        </Link>

        <div className="flex
                        shrink-0
                        items-center
                        gap-2">
          <MessageButtonLink username={friend.username} />

          {/* FriendButton handles remove with hover → "Remove" pattern */}
          <FriendButton
            targetUserId={friend.id}
            initialState="friends"
            onStateChange={(newState) => {
              if (newState === 'none') onRemoved()
            }}
          />
        </div>
      </div>
    </li>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyFriends() {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl
                    border
                    border-white/30
                    bg-white/40
                    py-16
                    text-center
                    backdrop-blur-sm">
      <UserPlusIcon className="mx-auto
                               mb-3
                               h-12
                               w-12
                               text-emerald-400" />
      <p className="font-semibold text-slate-700">{t('friends.noFriends')}</p>
      <p className="mt-1 text-sm text-slate-500">{t('friends.noFriendsHint')}</p>
    </div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────

function FriendsSkeleton() {
  return (
    <ul className="space-y-3">
      {[1, 2, 3].map((i) => (
        <li key={i} className="rounded-2xl
                               border
                               border-white/30
                               bg-white/40
                               p-4">
          <div className="flex
                          items-center
                          gap-3">
            <div className="h-10
                            w-10
                            rounded-full
                            bg-slate-200
                            animate-pulse
                            shrink-0" />
            <div className="flex-1
                            space-y-2">
              <div className="h-4
                              w-32
                              rounded
                              bg-slate-200
                              animate-pulse" />
              <div className="h-3
                              w-24
                              rounded
                              bg-slate-200
                              animate-pulse" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RequestsSkeleton() {
  return (
    <ul className="space-y-3">
      {[1, 2].map((i) => (
        <li key={i} className="rounded-2xl border border-white/30 bg-white/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-9 w-20 rounded-full bg-slate-200 animate-pulse" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

