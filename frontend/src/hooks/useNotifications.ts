import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getNotifications, markOneAsRead, markAllAsRead } from '../api/notifications';
import { getSocket } from '@/lib/socket'

export interface Notification {
  id: string;
  type: string;
  message: string;
  refId: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
      setError(null);
    } catch {
      setError(t('notification.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Initial fetch + polling
  useEffect(() => {
    void fetch();
    intervalRef.current = setInterval(fetch, POLL_INTERVAL);
    const socket = getSocket();

    function onNewNotification() {
      // Re-fetch when server pushes a new notification
      void fetch()
    }

    socket.on('notification:new', onNewNotification)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket.off('notification:new', onNewNotification)
    };
  }, [fetch]);

  // Optimistically mark one as read in local state
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markOneAsRead(id);
    } catch {
      // On failure, re-fetch to restore real state
      fetch();
    }
  }, [fetch]);

  // Optimistically mark all as read
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllAsRead();
    } catch {
      fetch();
    }
  }, [fetch]);

  // Remove a notification from local state — used for the race condition fix
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notif = prev.find((n) => n.id === id);
      if (notif && !notif.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetch,
    markRead,
    markAllRead,
    removeNotification,
  };
}
