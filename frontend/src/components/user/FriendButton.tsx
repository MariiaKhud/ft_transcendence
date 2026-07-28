import { useEffect, useState } from 'react';
import type { FriendshipState } from '@shared/types/friendship';
import {
  sendFriendRequest,
  cancelFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from '../../api/friends';
import { Button } from '@/components/ui/button';
import { PlusIcon, ClockIcon, CheckIcon, Spinner } from '@/components/ui/icons'

interface FriendButtonProps {
  targetUserId: string;
  initialState: FriendshipState;
}

export function FriendButton({ targetUserId, initialState }: FriendButtonProps) {
  const [state, setState] = useState<FriendshipState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local button state in sync when parent-provided state changes.
  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  // Run action, then transition to the expected next UI state.
  async function handle(action: () => Promise<void>, nextState: FriendshipState) {
    setLoading(true);
    setError(null);
    try {
      await action();
      setState(nextState);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong')
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
          aria-label="Send friend request"
          title="Click to send request"
        >
          {loading ? <Spinner /> : <PlusIcon />}
          Add Friend
        </Button>

        {error && <p className="text-xs text-red-500">{error}</p>}
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
          aria-label="Cancel friend request"
          title="Click to cancel request"
        >
          {loading ? <Spinner /> : <ClockIcon />}
          Pending
        </Button>

        {error && <p className="text-xs text-red-500">{error}</p>}
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
            aria-label="Accept friend request"
            title="Click to accept request"
          >
            {loading ? <Spinner /> : <CheckIcon />}
            Accept
          </Button>

          <Button
            variant="profileSecondary"
            onClick={() => handle(() => respondToFriendRequest(targetUserId, 'DECLINED'), 'none',)}
            disabled={loading}
            aria-label="Decline friend request"
            title="Click to decline request"
          >
            Decline
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
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
        aria-label="Remove friend"
        title="Click to remove friend"
      >
        {loading ? <Spinner /> : <CheckIcon />}
        Friends
      </Button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
