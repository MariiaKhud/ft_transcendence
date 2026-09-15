import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications, type Notification } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { PaginationButton } from '@/components/ui/pagination-button'
import { CheckIcon } from '@/components/ui/icons'
import {
  formatNotificationTime,
  notificationIcon,
} from '@/lib/notification-display'
import { navigateToNotification } from '@/lib/profile-navigation'
import { NotificationMessage } from '@/components/user/NotificationMessage'

export function Notifications() {
  const NOTIFICATIONS_PER_PAGE = 15
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
  } = useNotifications()

  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const visibleNotifications = notifications.slice(
    (currentPage - 1) * NOTIFICATIONS_PER_PAGE,
    currentPage * NOTIFICATIONS_PER_PAGE,
  )

  async function handleClick(notif: Notification) {
    if (!notif.isRead) await markRead(notif.id)

    navigateToNotification(navigate, notif)
  }

  return (
    <div className="mx-auto
                    max-w-4xl
                    space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm
                        font-semibold
                        uppercase
                        tracking-[0.15em]
                        text-purple-600">
            {t('notification.title')}
          </p>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-slate-500">
              {t('notification.unread', { count: unreadCount })}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="profile"
            onClick={() => void markAllRead()}
          >
            <CheckIcon />
            {t('notification.markAllRead')}
          </Button>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      {loading ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-2">
            {visibleNotifications.map((notif) => (
              <NotificationRow
                key={notif.id}
                notif={notif}
                onClick={() => void handleClick(notif)}
              />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8
                            flex
                            items-center
                            justify-center
                            gap-2">
              <PaginationButton
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t('common.previous')}
              </PaginationButton>

              <span className="font-medium text-slate-700">
                {t('common.pageOf', { page: currentPage, totalPages })}
              </span>

              <PaginationButton
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                {t('common.next')}
              </PaginationButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── NotificationRow ──────────────────────────────────────────

interface NotificationRowProps {
  notif: Notification
  onClick: () => void
}

function NotificationRow({
    notif,
    onClick,
  }: NotificationRowProps) {
  const { t } = useTranslation()

  return (
    <li
      className={`rounded-2xl
                  border
                  backdrop-blur-sm
                  transition-colors ${
        notif.isRead
          ? 'border-white/30 bg-white/40'
          : 'border-purple-100/50 bg-purple-50/40'
      }`}
    >
      {/* Clickable row */}
      <button
        onClick={onClick}
        className="w-full
                   cursor-pointer
                   p-4
                   text-left
                   hover:opacity-80
                   transition-opacity"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <span className="mt-0.5 shrink-0 text-xl" aria-hidden="true">
            {notificationIcon(notif.type)}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800">
              <NotificationMessage
                notif={notif}
                actorClassName="font-semibold"
              />
            </p>

            {notif.type === 'CONTENT_REMOVED' && notif.removalReason ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                {t('notification.types.removalReason', { reason: notif.removalReason })}
              </p>
            ) : null}

            {/* Sub-line — hint after accept, or timestamp */}
            <p className="mt-0.5 text-xs text-slate-400">
              {formatNotificationTime(notif.createdAt, t)}
            </p>
          </div>

          {/* Unread dot */}
          {!notif.isRead && (
            <span className="mt-1.5
                             h-2
                             w-2
                             shrink-0
                             rounded-full
                             bg-emerald-500" />
          )}
        </div>
      </button>

    </li>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl
                    border
                    border-white/30
                    bg-white/40
                    py-20
                    text-center
                    backdrop-blur-sm">
      <p className="text-4xl mb-3">🔔</p>
      <p className="font-semibold text-slate-700">{t('notification.empty')}</p>
      <p className="mt-1 text-sm text-slate-500">{t('notification.emptyHint')}</p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <ul className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <li
          key={i}
          className="rounded-2xl
                     border
                     border-white/30
                     bg-white/40
                     p-4
                     backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <div className="mt-0.5
                            h-7
                            w-7
                            rounded-full
                            bg-slate-200
                            animate-pulse
                            shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
