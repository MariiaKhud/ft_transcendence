import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import { getSocket } from '@/lib/socket'

const AUTO_DISMISS_MS = 5000
const EXIT_ANIMATION_MS = 300

// Listens for the server's 'gamification:level-up' event (emitted when an
// article or a received like pushes the current user past a level
// threshold) and pops up a celebratory toast. Mounted once near the app
// root so it fires no matter what page the user is on.
export function LevelUpToast() {
  const { t } = useTranslation()
  const [level, setLevel] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const socket = getSocket()

    let dismissTimer: ReturnType<typeof setTimeout>
    let removeTimer: ReturnType<typeof setTimeout>

    const onLevelUp = ({ level: newLevel }: { level: number }) => {
      clearTimeout(dismissTimer)
      clearTimeout(removeTimer)

      setLevel(newLevel)
      setIsVisible(true)

      dismissTimer = setTimeout(() => setIsVisible(false), AUTO_DISMISS_MS)
    }

    socket.on('gamification:level-up', onLevelUp)

    return () => {
      socket.off('gamification:level-up', onLevelUp)
      clearTimeout(dismissTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  useEffect(() => {
    if (isVisible || level === null) return
    const removeTimer = setTimeout(() => setLevel(null), EXIT_ANIMATION_MS)
    return () => clearTimeout(removeTimer)
  }, [isVisible, level])

  if (level === null) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-6 top-24 z-50 flex items-center gap-3 rounded-2xl border border-white/40 bg-gradient-to-br from-purple-600 to-pink-600 px-5 py-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <Trophy className="h-8 w-8 shrink-0 text-amber-300" />
      <div>
        <p className="font-semibold leading-tight">{t('profile.levelUpToastTitle')}</p>
        <p className="text-sm text-white/90">{t('profile.levelUpToastBody', { level })}</p>
      </div>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        aria-label={t('common.dismiss')}
        className="ml-2 shrink-0 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
