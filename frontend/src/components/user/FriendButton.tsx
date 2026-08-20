import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FriendshipState } from '@shared/types/friendship';
import {
  sendFriendRequest,
  cancelFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from '../../api/friends';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  ClockIcon,
  CheckIcon,
  Spinner,
  XIcon,
} from '@/components/ui/icons'
import { translateApiError } from '@/lib/api-errors'
import { useAuth } from '@/hooks/useAuth'

interface FriendButtonProps {
  targetUserId: string;
  initialState: FriendshipState;
}

export function FriendButton({ targetUserId, initialState }: FriendButtonProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [state, setState] = useState<FriendshipState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Keep local button state in sync when parent-provided state changes.
  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  // Hide for guests and own profile.
  if (!currentUser || currentUser.id === targetUserId) return null;

  // Run action, then transition to the expected next UI state.
  async function handle(action: () => Promise<void>, nextState: FriendshipState) {
    setLoading(true);
    setError(null);
    try {
      await action();
      setState(nextState);
    } catch (error) {
      setError(translateApiError(
        error,
        error instanceof Error
        ? error.message
        : t('common.somethingWrong')
      ))
    } finally {
      setLoading(false);
    }
  }

  if (state === 'none') {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="profile"
          onClick={() => handle(() => sendFriendRequest(targetUserId), 'pending_sent')}
          disabled={loading}
          aria-label={t('friendButton.sendAria')}
          title={t('friendButton.sendTitle')}
        >
          {loading ? <Spinner /> : <PlusIcon />}
          {t('friendButton.addFriend')}
        </Button>

        {error && <p className="text-xs text-pink-600">{error}</p>}
      </div>
    );
  }

  if (state === 'pending_sent') {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="profileSecondary"
          onClick={() => handle(() => cancelFriendRequest(targetUserId), 'none')}
          disabled={loading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={isHovered ? t('friendButton.cancelRequest') : t('friendButton.pending')}
        >
          {loading ? (
            <Spinner />
          ) : isHovered ? (
            <XIcon />
          ) : (
            <ClockIcon />
          )}

          {isHovered
            ? t('friendButton.cancelRequest')
            : t('friendButton.pending')}
        </Button>

        {error && <p className="text-xs text-pink-600">{error}</p>}
      </div>
    );
  }

  if (state === 'pending_received') {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-2">
          <Button
            variant="profileSuccess"
            onClick={() => handle(() => respondToFriendRequest(targetUserId, 'ACCEPTED'), 'friends',)}
            disabled={loading}
            aria-label={t('friendButton.acceptAria')}
            title={t('friendButton.acceptTitle')}
          >
            {loading ? <Spinner /> : <CheckIcon />}
            {t('friendButton.accept')}
          </Button>

          <Button
            variant="profileSecondary"
            onClick={() => handle(() => respondToFriendRequest(targetUserId, 'DECLINED'), 'none',)}
            disabled={loading}
            aria-label={t('friendButton.declineAria')}
            title={t('friendButton.declineTitle')}
          >
            {t('friendButton.decline')}
          </Button>
        </div>

        {error && (
          <p className="text-xs text-pink-600">{error}</p>
        )}
      </div>
    );
  }

  // state === 'friends'
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="profileSecondary"
        onClick={() => handle(() => removeFriend(targetUserId), 'none')}
        disabled={loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={
          isHovered
            ? t('friendButton.remove')
            : t('friendButton.friends')
        }
        title={
          isHovered
            ? t('friendButton.removeTitle')
            : t('friendButton.friends')
        }
      >
        {loading ? (
          <Spinner />
        ) : isHovered ? (
          <XIcon />
        ) : (
          <CheckIcon />
        )}

        {isHovered
          ? t('friendButton.remove')
          : t('friendButton.friends')}
      </Button>

      {error && (
        <p className="text-xs text-pink-600">{error}</p>
      )}
    </div>
  );
}
