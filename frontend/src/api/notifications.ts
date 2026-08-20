export async function getNotifications(unreadOnly = false) {
  const url = unreadOnly
    ? '/api/notifications?unread=true'
    : '/api/notifications';
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) throw await res.json();

  return res.json();
}

export async function markOneAsRead(notificationId: string) {
  const res = await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    credentials: 'include',
  });

  if (!res.ok) throw await res.json();

  return res.json();
}

export async function markAllAsRead() {
  const res = await fetch('/api/notifications/read-all', {
    method: 'PATCH',
    credentials: 'include',
  });

  if (!res.ok) throw await res.json();

  return res.json();
}
