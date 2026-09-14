import { useTranslation } from 'react-i18next'
import { getProgressToNextLevel } from '@shared/types/gamification'

interface XPBarProps {
  level: number
  experiencePoints: number
  className?: string
}

export const XPBar = ({ level, experiencePoints, className = '' }: XPBarProps) => {
  const { t, i18n } = useTranslation()

  const { current: xpInCurrentLevel, needed: xpNeeded, percentage } = getProgressToNextLevel(
    experiencePoints,
    level,
  )

  return (
    <div className={`rounded-2xl border border-white/50 bg-white/60 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {t('profile.statProgress')}
        </p>
        <span className="text-xs font-semibold uppercase text-purple-600">
        {t('profile.statLevel')} {level}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="relative mt-6 h-5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('profile.levelProgressAria', { level, percent: Math.round(percentage) })}
        />
      </div>
      
      {/* XP text */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-600">
          {t('profile.xpTotal', { xp: experiencePoints.toLocaleString(i18n.language) })}
        </span>
        <span className="text-slate-500">
          {t('profile.toNextLevel', { 
          current: xpInCurrentLevel, 
          needed: xpNeeded 
          })}
        </span>
      </div>
    </div>
  )
}