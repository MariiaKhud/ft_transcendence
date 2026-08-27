import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import { respondToFriendRequest } from '../../api/friends';
import {
  formatNotificationTime,
  getNotificationActionState,
  notificationIcon,
} from '@/lib/notification-display'
import { navigateToNotification } from '@/lib/profile-navigation'
import { NotificationMessage } from '@/components/user/NotificationMessage'
import { BellIcon, NotificationsSkeleton} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [actedOn, setActedOn] = useState<Map<string, 'accepted' | 'declined'>>(new Map());
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    removeNotification,
    refetch,
  } = useNotifications();
  const location = useLocation();
  const isOnNotificationsPage = location.pathname === '/notifications';

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

  // ── Race condition fix ────────────────────────────────────
  // If the bell shows a FRIEND_REQUEST notification but the sender
  // cancelled it, clicking Accept returns 404.
  // We catch it, show a message, remove the stale notification,
  // and re-fetch to sync state.
  async function handleAcceptFromBell(notif: Notification) {
    if (!notif.refId) return;
    try {
      await respondToFriendRequest(notif.refId, 'ACCEPTED');
      if (!notif.isRead) await markRead(notif.id);
      setActedOn((prev) => new Map(prev).set(notif.id, 'accepted'));
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404 || err?.error?.includes('not found')) {
        // Request was cancelled — remove stale notification
        removeNotification(notif.id);
        refetch(); // re-sync everything
        return;
      }

      throw err;
    }
  }

  async function handleDeclineFromBell(notif: Notification) {
    if (!notif.refId) return;
    try {
      await respondToFriendRequest(notif.refId, 'DECLINED');
      if (!notif.isRead) await markRead(notif.id);
      setActedOn((prev) => new Map(prev).set(notif.id, 'declined'));
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        removeNotification(notif.id);
        refetch();
        return;
      }

      throw err;
    }
  }

  const recent = notifications.slice(0, 8); // show max 8 in dropdown

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Bell button ─────────────────────────────────── */}
      <button
        onClick={() => {
          if (isOnNotificationsPage) return
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
        aria-expanded={open}
        aria-haspopup="true"
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
      {open && !isOnNotificationsPage && (
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
                    actionResult={actedOn.get(notif.id)}
                    onClick={() => handleNotificationClick(notif)}
                    onAccept={
                      notif.type === 'FRIEND_REQUEST' &&
                      !getNotificationActionState(notif, actedOn.get(notif.id))
                        ? () => handleAcceptFromBell(notif)
                        : undefined
                    }
                    onDecline={
                      notif.type === 'FRIEND_REQUEST' &&
                      !getNotificationActionState(notif, actedOn.get(notif.id))
                        ? () => handleDeclineFromBell(notif)
                        : undefined
                    }
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
  actionResult?: 'accepted' | 'declined';
  onClick: () => void;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
}

function NotificationItem({
    notif,
    actionResult,
    onClick,
    onAccept,
    onDecline
  }: NotificationItemProps) {
  const { t } = useTranslation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  async function handleAction(fn: () => Promise<void>) {
    setActioning(true);
    setActionError(null);
    try {
      await fn();
    } catch (err: any) {
      const errorMessage = typeof err?.message === 'string' ? err.message.toLowerCase() : '';

      if (err?.status === 409 && errorMessage.includes('declined')) {
        setActionError(t('notification.alreadyDeclined'));
      } else if (err?.status === 409 && errorMessage.includes('already friends')) {
        setActionError(t('notification.alreadyAccepted'));
      } else {
        setActionError(t('notification.actionUnavailable'));
      }
    } finally {
      setActioning(false);
    }
  }

  const resolvedState = getNotificationActionState(notif, actionResult);

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
            {resolvedState === 'accepted'
            ? '🤝'
            : resolvedState === 'declined'
              ? '🚫'
              : notificationIcon(notif.type)}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">
              <NotificationMessage
                notif={notif}
                actionResult={actionResult}
              />
            </p>

            <p className={`text-xs mt-0.5 ${
              resolvedState === 'accepted'
                ? 'text-teal-500'
                : resolvedState === 'declined'
                  ? 'text-gray-400'
                  : 'text-gray-400'
            }`}>
              {resolvedState === 'accepted'
                ? t('notification.chatHint')
                : formatNotificationTime(notif.createdAt, t)}
            </p>
          </div>

          {/* Unread dot */}
          {!notif.isRead && !resolvedState && (
            <span className="w-2
                             h-2
                             rounded-full
                             bg-emerald-500
                             flex-shrink-0 mt-1.5" />
          )}
        </div>
      </button>

      {/* Inline Accept/Decline for FRIEND_REQUEST */}
      {notif.type === 'FRIEND_REQUEST' && !resolvedState && onAccept && onDecline && (
        <div className="mt-2
                        ml-9
                        flex
                        items-center
                        gap-2">

          {actionError ? (
              <p className="text-xs text-pink-600">{actionError}</p>
            ) : (
              <>
                <Button
                  variant="profileSuccess"
                  size="notification"
                  disabled={actioning}
                  onClick={(e) => {
                    e.stopPropagation();  // ← prevent row click navigating to /friends
                    void handleAction(onAccept);
                  }}
                >
                  {actioning ? t('notification.processing') : t('notification.accept')}
                </Button>
                <Button
                  variant="profileSecondary"
                  size="notification"
                  disabled={actioning}
                  onClick={(e) => {
                    e.stopPropagation();  // ← same
                    void handleAction(onDecline);
                  }}
                >
                  {t('notification.decline')}
                </Button>
              </>
            )}
        </div>
      )}
    </li>
  );
}
