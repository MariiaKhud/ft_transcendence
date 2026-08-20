import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { followUser, unfollowUser, getFollowStatus } from '../../api/follows';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { PlusIcon, CheckIcon, Spinner, XIcon } from '@/components/ui/icons'
import { translateApiError } from '@/lib/api-errors'

interface FollowButtonProps {
  targetUserId: string;
  // Optional: if omitted, status is fetched on mount.
  initialIsFollowing?: boolean;
  // Optional callback used by parent to update follower count.
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  onFollowChange,
}: FollowButtonProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(initialIsFollowing === undefined);
  const [error, setError] = useState<string | null>(null);

  // Fetch follow status on mount when parent did not provide it.
  useEffect(() => {
    if (initialIsFollowing !== undefined) return;
    if (!currentUser || currentUser.id === targetUserId) return;

    getFollowStatus(targetUserId)
      .then((res) => setIsFollowing(res.isFollowing))
        // If status lookup fails, keep default label and avoid blocking UI.
        .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetUserId, currentUser, initialIsFollowing]);

  // Hide for guests and own profile.
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
    } catch (error) {
      setError(translateApiError(error, error instanceof Error ? error.message : t('common.somethingWrong')))
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
        aria-label={isFollowing ? t('followButton.unfollow') : t('followButton.follow')}
        aria-pressed={isFollowing}
      >
        {loading ? (
          <Spinner />
        ) : isFollowing ? (
          isHovered ? <XIcon /> : <CheckIcon />
        ) : (
          <PlusIcon />
        )}

        {isFollowing ? (isHovered ? t('followButton.unfollow') : t('followButton.following')) : t('followButton.follow')}
      </Button>

      {error && <p className="text-xs text-pink-600" role="alert">{error}</p>}
    </div>
  );
}
