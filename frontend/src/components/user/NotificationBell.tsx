import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import {
  formatNotificationTime,
  notificationIcon,
} from '@/lib/notification-display'
import { navigateToNotification } from '@/lib/profile-navigation'
import { NotificationMessage } from '@/components/user/NotificationMessage'
import { BellIcon, NotificationsSkeleton} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface NotificationBellProps {
  navigationOnly?: boolean
}

export function NotificationBell({ navigationOnly = false }: NotificationBellProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  async function handleNotificationClick(notif: Notification) {
    if (!notif.isRead) await markRead(notif.id);

    navigateToNotification(navigate, notif)
    setOpen(false)
  }

  const recent = notifications.slice(0, 8); // show max 8 in dropdown

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Bell button ─────────────────────────────────── */}
      <button
        onClick={() => {
          if (navigationOnly) {
            navigate('/notifications')
            return
          }

          setOpen((prev) => !prev)
        }}
        className="relative
                   p-2
                   text-gray-500
                   hover:text-gray-900
                   hover:bg-indigo-100
                   rounded-lg
                   transition-colors
                   focus:outline-none
                   focus:ring-2
                   focus:ring-blue-500"
        aria-label={unreadCount > 0 ? t('notification.bellAriaLabelUnread', { count: unreadCount }) : t('notification.title')}
        aria-expanded={navigationOnly ? undefined : open}
        aria-haspopup={navigationOnly ? undefined : 'true'}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            className="absolute
                       -top-0.5
                       -right-0.5
                       min-w-[18px]
                       h-[18px]
                       px-1
                       flex
                       items-center
                       justify-center
                       bg-pink-500
                       text-white
                       text-[11px]
                       font-bold
                       rounded-full"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label={t('notification.title')}
          className="absolute
                     right-0
                     mt-2
                     w-[28rem]
                     max-w-[calc(90vw-1rem)]
                     bg-white
                     border
                     border-gray-200
                     rounded-2xl
                     shadow-xl
                     z-50
                     overflow-hidden"
        >
          {/* Header */}
          <div className="flex
                          items-center
                          justify-between
                          px-4
                          py-3
                          border-b
                          border-gray-100">
            <h3 className="font-semibold text-gray-900">{t('notification.title')}</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs
                             text-purple-700
                             hover:text-fuchsia-600
                             font-medium"
                >
                  {t('notification.markAllRead')}
                </button>
              )}
              <button
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="text-xs
                           text-gray-500
                           hover:text-gray-700"
              >
                {t('notification.seeAll')}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <NotificationsSkeleton />
            ) : recent.length === 0 ? (
              <div className="py-12
                              text-center
                              text-gray-500">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm">{t('notification.empty')}</p>
              </div>
            ) : (
              <ul>
                {recent.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleNotificationClick(notif)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer — only if there are more than 8 */}
          {notifications.length > 8 && (
            <div className="border-t
                            border-gray-100
                            px-4 py-3
                            text-center">
              <Button
                variant="profile"
                size="notification"
                onClick={() => { navigate('/notifications'); setOpen(false); }}
              >
                {t('notification.viewAll')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notification item ────────────────────────────────────────

interface NotificationItemProps {
  notif: Notification;
  onClick: () => void;
}

function NotificationItem({
    notif,
    onClick,
  }: NotificationItemProps) {
  const { t } = useTranslation();

  return (
    <li
      className={`px-4
                  py-3
                  border-b
                  border-gray-50
                  last:border-0
                  transition-colors ${
        notif.isRead ? 'bg-white' : 'bg-blue-50'
      }`}
    >
      <button
        onClick={onClick}
        className="w-full
                   text-left
                   hover:opacity-80
                   transition-opacity
                   cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* Icon for notification type */}
          <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
            {notificationIcon(notif.type)}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">
              <NotificationMessage
                notif={notif}
                actorClassName="font-semibold"
              />
            </p>

            <p className="mt-0.5 text-xs text-gray-400">
              {formatNotificationTime(notif.createdAt, t)}
            </p>
          </div>

          {/* Unread dot */}
          {!notif.isRead && (
            <span className="w-2
                             h-2
                             rounded-full
                             bg-emerald-500
                             flex-shrink-0 mt-1.5" />
          )}
        </div>
      </button>
    </li>
  );
}
