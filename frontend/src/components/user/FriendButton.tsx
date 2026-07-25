import { useEffect, useState } from 'react';
import type { FriendshipState } from '@shared/types/friendship';
import {
  sendFriendRequest,
  cancelFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from '../../api/friends';
import { Button } from '@/components/ui/button';

interface FriendButtonProps {
  targetUserId: string;
  initialState: FriendshipState;
}

export function FriendButton({ targetUserId, initialState }: FriendButtonProps) {
  const [state, setState] = useState<FriendshipState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  async function handle(action: () => Promise<void>, nextState: FriendshipState) {
    setLoading(true);
    setError(null);
    try {
      await action();
      setState(nextState);
    } catch (err: any) {
      setError(err?.error ?? 'Something went wrong');
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

// ─── Tiny inline icons — no extra dependency needed ───────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
