import { useState, useEffect } from 'react';
import { followUser, unfollowUser, getFollowStatus } from '../../api/follows';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PlusIcon, CheckIcon, Spinner, XIcon } from '@/components/ui/icons'

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;  // optional — fetched if not provided
  onFollowChange?: (isFollowing: boolean) => void;  // optional callback to update follower count on profile
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  onFollowChange,
}: FollowButtonProps) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(initialIsFollowing === undefined);
  const [error, setError] = useState<string | null>(null);

  // Fetch follow status on mount if not provided by parent
  useEffect(() => {
    if (initialIsFollowing !== undefined) return;
    if (!currentUser || currentUser.id === targetUserId) return;

    getFollowStatus(targetUserId)
      .then((res) => setIsFollowing(res.isFollowing))
      .catch(() => {})  // fail silently — guests just see Follow
      .finally(() => setLoading(false));
  }, [targetUserId, currentUser, initialIsFollowing]);

  // Hide on own profile or when not logged in
  if (!currentUser || currentUser.id === targetUserId) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      if (isFollowing) {
        await unfollowUser(targetUserId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followUser(targetUserId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err: any) {
      setError(err?.error ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const buttonVariant = isFollowing ? 'profileSecondary' : 'profile'

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={buttonVariant}
        onClick={handleClick}
        disabled={loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isFollowing ? 'Unfollow' : 'Follow'}
        aria-pressed={isFollowing}
      >
        {loading ? (
          <Spinner />
        ) : isFollowing ? (
          isHovered ? <XIcon /> : <CheckIcon />
        ) : (
          <PlusIcon />
        )}

        {isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow'}
      </Button>

      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}
