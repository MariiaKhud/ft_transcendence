import { useState } from 'react';
import type { FriendshipState } from '@shared/types/friendship';
import {
  sendFriendRequest,
  cancelFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from '../../api/friends';

interface FriendButtonProps {
  targetUserId: string;
  initialState: FriendshipState;
}

export function FriendButton({ targetUserId, initialState }: FriendButtonProps) {
  const [state, setState] = useState<FriendshipState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Shared button style base
  const base = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';

  if (state === 'none') {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => handle(() => sendFriendRequest(targetUserId), 'pending_sent')}
          disabled={loading}
          className={`${base} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`}
          aria-label="Send friend request"
        >
          {loading ? <Spinner /> : <PlusIcon />}
          Add Friend
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (state === 'pending_sent') {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => handle(() => cancelFriendRequest(targetUserId), 'none')}
          disabled={loading}
          className={`${base} bg-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-300 border border-gray-300 text-gray-600 focus:ring-gray-400`}
          aria-label="Cancel friend request"
          title="Click to cancel request"
        >
          {loading ? <Spinner /> : <ClockIcon />}
          Pending
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (state === 'pending_received') {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-2">
          <button
            onClick={() => handle(
              () => respondToFriendRequest(targetUserId, 'ACCEPTED'),
              'friends'
            )}
            disabled={loading}
            className={`${base} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`}
            aria-label="Accept friend request"
          >
            {loading ? <Spinner /> : <CheckIcon />}
            Accept
          </button>
          <button
            onClick={() => handle(
              () => respondToFriendRequest(targetUserId, 'DECLINED'),
              'none'
            )}
            disabled={loading}
            className={`${base} bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 focus:ring-gray-400`}
            aria-label="Decline friend request"
          >
            Decline
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // state === 'friends'
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => handle(() => removeFriend(targetUserId), 'none')}
        disabled={loading}
        className={`${base} bg-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-300 border border-gray-300 text-gray-600 focus:ring-gray-400`}
        aria-label="Remove friend"
        title="Click to remove friend"
      >
        {loading ? <Spinner /> : <CheckIcon />}
        Friends
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
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
