export async function followUser(userId: string) {
  const res = await fetch(`/api/follows/${userId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function unfollowUser(userId: string) {
  const res = await fetch(`/api/follows/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getFollowStatus(userId: string): Promise<{ isFollowing: boolean }> {
  const res = await fetch(`/api/follows/status/${userId}`, {
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  const json = await res.json();
  return json.data;
}
