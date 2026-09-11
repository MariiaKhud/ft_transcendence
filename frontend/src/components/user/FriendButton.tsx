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
import { getApiErrorCode } from '@/lib/api-errors'
import { useAuth } from '@/hooks/useAuth'
import { getFriendshipStatus } from '../../api/friends'

interface FriendButtonProps {
  targetUserId: string;
  initialState: FriendshipState;
  onStateChange?: (newState: FriendshipState) => void
  className?: string
}

interface FriendButtonErrorState {
  code: string | null
  message: string
  translationKey?: string
}

function FriendButtonError({ error }: { error: FriendButtonErrorState | null }) {
  const { t } = useTranslation()

  if (!error) return null

  return (
    <p
      role="status"
      className="basis-full
                 w-full
                 max-w-[200px]
                 rounded-lg
                 border
                 border-amber-200/50
                 bg-amber-50/95
                 px-3
                 py-2
                 text-center
                 text-xs
                 font-medium
                 leading-snug
                 text-amber-700
                 shadow-sm"
    >
      {error.translationKey ? t(error.translationKey) : error.code ? t(`api.errors.${error.code}`) : error.message}
    </p>
  )
}

export function FriendButton({ targetUserId, initialState, onStateChange, className }: FriendButtonProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [state, setState] = useState<FriendshipState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FriendButtonErrorState | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasActed, setHasActed] = useState(false);

  useEffect(() => {
    if (!hasActed) {
      setState(initialState);
    }
  }, [initialState, hasActed]);

  // Hide for guests and own profile
  if (!currentUser || currentUser.id === targetUserId) return null;

  // Run action, then transition to the expected next UI state
  async function handle(action: () => Promise<unknown>, nextState: FriendshipState) {
    setLoading(true);
    setError(null);
    setHasActed(true);
    try {
      const result = await action() as { alreadyAccepted?: boolean; alreadyDeclined?: boolean }
      const resolvedState = result?.alreadyAccepted
        ? 'friends'
        : result?.alreadyDeclined
          ? 'none'
          : nextState
      setState(resolvedState);
      onStateChange?.(resolvedState);
      window.dispatchEvent(new Event('notifications:changed'))
      if (result?.alreadyAccepted) {
        setError({ code: null, message: '', translationKey: 'notification.alreadyAccepted' })
      } else if (result?.alreadyDeclined) {
        setError({ code: null, message: '', translationKey: 'notification.alreadyDeclined' })
      }
    } catch (error) {
      setError({
        code: getApiErrorCode(error),
        message: translateApiError(error, error instanceof Error ? error.message : t('common.somethingWrong')),
      })
    } finally {
      setLoading(false);
    }
  }

  if (state === 'none') {
    return (
      <div className={`${className ?? ''} relative flex flex-col items-end gap-1`}>
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

        <FriendButtonError error={error} />
      </div>
    );
  }

  if (state === 'pending_sent') {
    return (
      <div className={`${className ?? ''} relative flex flex-col items-end gap-1`}>
        <Button
          variant="profileSecondary"
          onClick={async () => {
            setLoading(true)
            setError(null)
            setHasActed(true)
            try {
              await cancelFriendRequest(targetUserId)
              setState('none')
              onStateChange?.('none')
            } catch (err: any) {
              if (err?.status === 404 || err?.statusCode === 404) {
                // 404 means request is no longer PENDING — but we don't know why
                // Ask the backend what the actual state is
                try {
                  const { state: realState } = await getFriendshipStatus(targetUserId)
                  setState(realState)
                  onStateChange?.(realState)
                } catch {
                  // If status check also fails, default to none — safest fallback
                  setState('none')
                  onStateChange?.('none')
                }
              } else {
                setError({
                  code: getApiErrorCode(err),
                  message: translateApiError(err, err instanceof Error ? err.message : t('common.somethingWrong')),
                })
              }
            } finally {
              setLoading(false)
            }
          }}
          disabled={loading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={isHovered ? t('friendButton.cancelRequest') : t('friendButton.pending')}
        >
          {loading ? <Spinner /> : isHovered ? <XIcon /> : <ClockIcon />}
          {isHovered ? t('friendButton.cancelRequest') : t('friendButton.pending')}
        </Button>

        <FriendButtonError error={error} />
      </div>
    )
  }

  if (state === 'pending_received') {
    return (
      <div className={`${className ?? ''} relative flex flex-col items-end gap-1`}>
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

        <FriendButtonError error={error} />
      </div>
    );
  }

  // state === 'friends'
  return (
    <div className={`${className ?? ''} relative flex flex-col items-end gap-1`}>
      <Button
        variant="profileSecondary"
        onClick={() => handle(() => removeFriend(targetUserId), 'none')}
        disabled={loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={t('friendButton.remove')}
        title={t('friendButton.removeTitle')}
      >
        {loading ? <Spinner /> : isHovered ? <XIcon /> : <CheckIcon />}

        {isHovered
          ? t('friendButton.remove')
          : t('friendButton.friends')}
      </Button>

      <FriendButtonError error={error} />
    </div>
  );
}
