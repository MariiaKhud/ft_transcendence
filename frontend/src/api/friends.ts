const BASE = '/api';

export async function sendFriendRequest(userId: string) {
  const res = await fetch(`${BASE}/friends/request/${userId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function respondToFriendRequest(userId: string, action: 'ACCEPTED' | 'DECLINED') {
  const res = await fetch(`${BASE}/friends/request/${userId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function cancelFriendRequest(userId: string) {
  const res = await fetch(`${BASE}/friends/request/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function removeFriend(userId: string) {
  const res = await fetch(`${BASE}/friends/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getIncomingRequests() {
  const res = await fetch(`${BASE}/friends/requests`, { credentials: 'include' });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getFriends() {
  const res = await fetch(`${BASE}/friends`, { credentials: 'include' });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getSentRequests() {
  const res = await fetch(`${BASE}/friends/requests/sent`, {
    credentials: 'include',
  })

  if (!res.ok) throw await res.json()

  return res.json()
}
