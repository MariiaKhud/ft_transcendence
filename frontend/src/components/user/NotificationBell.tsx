import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import { respondToFriendRequest } from '../../api/friends';
import { BellIcon, NotificationsSkeleton} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    removeNotification,
    refetch,
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
    // Mark as read first
    if (!notif.isRead) await markRead(notif.id);

    // Navigate to the relevant page based on type
    switch (notif.type) {
      case 'FRIEND_REQUEST':
        navigate('/friends');
        break;
      case 'FRIEND_ACCEPTED':
        if (notif.refId) navigate(`/profile/${notif.refId}`);
        break;
      case 'FOLLOWED':
        if (notif.refId) navigate(`/profile/${notif.refId}`);
        break;
      case 'COMMENT':
      case 'LIKE':
        if (notif.refId) navigate(`/articles/${notif.refId}`);
        break;
      case 'CONTENT_REMOVED':
        navigate('/profile');
        break;
      default:
        break;
    }

    setOpen(false);
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
      removeNotification(notif.id);
      navigate('/friends');
    } catch (err: any) {
      if (err?.error?.includes('not found') || err?.statusCode === 404) {
        // Request was cancelled — remove stale notification
        removeNotification(notif.id);
        refetch(); // re-sync everything
      }
    }
  }

  async function handleDeclineFromBell(notif: Notification) {
    if (!notif.refId) return;
    try {
      await respondToFriendRequest(notif.refId, 'DECLINED');
      removeNotification(notif.id);
    } catch {
      removeNotification(notif.id);
      refetch();
    }
  }

  const recent = notifications.slice(0, 8); // show max 8 in dropdown

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Bell button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
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
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            className="absolute
                       -top-0.5
                       -right-0.5\
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
          aria-label="Notifications"
          className="absolute
                     right-0
                     mt-2
                     w-96
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
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs
                             text-purple-700
                             hover:text-fuchsia-600
                             font-medium"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="text-xs
                           text-gray-500
                           hover:text-gray-700"
              >
                See all
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
                <p className="text-sm">You're all caught up</p>
              </div>
            ) : (
              <ul>
                {recent.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onClick={() => handleNotificationClick(notif)}
                    onAccept={
                      notif.type === 'FRIEND_REQUEST'
                        ? () => handleAcceptFromBell(notif)
                        : undefined
                    }
                    onDecline={
                      notif.type === 'FRIEND_REQUEST'
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
                View all {notifications.length} notifications
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
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
}

function NotificationItem({ notif, onClick, onAccept, onDecline }: NotificationItemProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  async function handleAction(fn: () => Promise<void>) {
    setActioning(true);
    setActionError(null);
    try {
      await fn();
    } catch {
      setActionError('This request is no longer available');
    } finally {
      setActioning(false);
    }
  }

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
                   transition-opacity"
      >
        <div className="flex items-start gap-3">
          {/* Icon for notification type */}
          <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
            {notificationIcon(notif.type)}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">
              <span className="font-medium">
                {notif.actor?.displayName || notif.actor?.username || 'Someone'}
              </span>{' '}
              {notif.message}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTime(notif.createdAt)}
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

      {/* Inline Accept/Decline for FRIEND_REQUEST */}
      {notif.type === 'FRIEND_REQUEST' && onAccept && onDecline && (
        <div className="mt-2
                        ml-9
                        flex items-center
                        gap-2">
          {actionError ? (
            <p className="text-xs text-pink-600">{actionError}</p>
          ) : (
            <>
              <Button
                variant="profileSuccess"
                size="notification"
                disabled={actioning}
                onClick={() => handleAction(onAccept)}
              >
                {actioning ? '...' : 'Accept'}
              </Button>
              <Button
                variant="profileSecondary"
                size="notification"
                disabled={actioning}
                onClick={() => handleAction(onDecline)}
              >
                Decline
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function notificationIcon(type: string): string {
  const icons: Record<string, string> = {
    FRIEND_REQUEST:  '👋',
    FRIEND_ACCEPTED: '🤝',
    FOLLOWED:        '➕',
    COMMENT:         '💬',
    LIKE:            '❤️',
    CONTENT_REMOVED: '🚫',
  };
  return icons[type] ?? '🔔';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
