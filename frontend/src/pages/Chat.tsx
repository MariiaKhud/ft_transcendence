import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { getSocket } from '@/lib/socket'
import { apiRequest } from '@/api/client'
import { ChatWindow } from '@/components/user/ChatWindow'
import { UserAvatar } from '@/components/user/UserAvatar'
import type { PublicProfile } from '@/types/profile'
import { BackIcon } from '@/components/ui/icons'

export function Chat() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { currentUser } = useAuth()

  const [otherUser, setOtherUser] = useState<PublicProfile | null>(null)
  const [otherUserOnline, setOtherUserOnline] = useState(false)
  const [loadingUser, setLoadingUser] = useState(true)

  const { messages, loading, error, sending, sendMessage } = useChat(
    otherUser?.id ?? ''
  )

  // Load the other user's profile for the header
  useEffect(() => {
    if (!username) return
    setLoadingUser(true)
    apiRequest<PublicProfile>(`/users/${encodeURIComponent(username)}`, {
      fallbackMessage: 'Failed to load user',
    })
      .then((res) => {
        setOtherUser(res.data ?? null)
        setOtherUserOnline(res.data?.isOnline ?? false)
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false))
  }, [username])

  // Listen for online/offline events for this specific user
  useEffect(() => {
    if (!otherUser?.id) return
    const otherUserId = otherUser.id
    const socket = getSocket()

    function onOnline(data: { userId: string }) {
      if (data.userId === otherUserId) setOtherUserOnline(true)
    }

    function onOffline(data: { userId: string }) {
      if (data.userId === otherUserId) setOtherUserOnline(false)
    }

    socket.on('user:online', onOnline)
    socket.on('user:offline', onOffline)

    return () => {
      socket.off('user:online', onOnline)
      socket.off('user:offline', onOffline)
    }
  }, [otherUser?.id])

  if (!currentUser || !username) return null

  return (
    <div className="mx-auto
                    flex
                    h-[calc(80vh-3rem)]
                    max-w-4xl
                    flex-col">

      {/* ── Chat header ───────────────────────────────────── */}
      <div className="mb-4
                      rounded-2xl
                      border
                      border-white/30
                      bg-white/40
                      px-4
                      py-3
                      shadow-sm
                      backdrop-blur-sm">
        <div className="flex items-center gap-3">

          {/* Back to friends */}
          <Link
            to="/friends"
            className="shrink-0
                       text-slate-400
                       hover:text-purple-600
                       transition-colors"
            aria-label={t('chat.backToFriends')}
          >
            <BackIcon />
          </Link>

          {/* User info */}
          {loadingUser ? (
            <HeaderSkeleton />
          ) : otherUser ? (
            <Link
              to={`/profile/${otherUser.username}`}
              className="flex
                         min-w-0
                         flex-1
                         items-center
                         gap-3
                         hover:opacity-80
                         transition-opacity"
            >
              {/* Avatar with online indicator */}
              <div className="relative shrink-0">
                <UserAvatar
                  avatarUrl={otherUser.avatarUrl}
                  username={otherUser.username}
                />
                <span
                  className={`absolute bottom-0
                              right-0
                              h-3
                              w-3
                              rounded-full
                              border-2
                              border-white ${
                    otherUserOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {otherUser.displayName ?? otherUser.username}
                </p>
                <p className={`text-xs ${
                  otherUserOnline ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {otherUserOnline
                    ? t('friends.online')
                    : t('chat.offline')}
                </p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-slate-500">{t('chat.userNotFound')}</p>
          )}
        </div>
      </div>

      {/* ── Chat body ─────────────────────────────────────── */}
      <div className="flex-1
                      overflow-hidden
                      rounded-2xl
                      border
                      border-white/30
                      bg-white/40
                      shadow-sm
                      backdrop-blur-sm">
        {loading ? (
          <MessagesSkeleton />
        ) : (
          <ChatWindow
            messages={messages}
            currentUserId={currentUser.id}
            sending={sending}
            error={error}
            onSend={sendMessage}
          />
        )}
      </div>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="flex
                    flex-1
                    items-center
                    gap-3">
      <div className="h-10
                      w-10
                      rounded-full
                      bg-slate-200
                      animate-pulse
                      shrink-0" />
      <div className="space-y-2">
        <div className="h-4
                        w-28
                        rounded
                        bg-slate-200
                        animate-pulse" />
        <div className="h-3
                        w-16
                        rounded
                        bg-slate-200
                        animate-pulse" />
      </div>
    </div>
  )
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
          <div className="h-7
                          w-7
                          rounded-full
                          bg-slate-200
                          animate-pulse
                          shrink-0" />

          <div className={`h-10
                          rounded-2xl
                          bg-slate-200
                          animate-pulse ${
            i % 2 === 0 ? 'w-48' : 'w-36'
          }`} />
        </div>
      ))}
    </div>
  )
}
