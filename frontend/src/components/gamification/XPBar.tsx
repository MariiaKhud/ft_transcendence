import { useTranslation } from 'react-i18next'

interface XPBarProps {
  level: number
  experiencePoints: number
  className?: string
}

export const XPBar = ({ level, experiencePoints, className = '' }: XPBarProps) => {
  const { t } = useTranslation()
  
  // Calculate XP in current level (assuming 100 XP per level)
  const xpInCurrentLevel = experiencePoints % 100
  const xpNeeded = 100
  const percentage = Math.min(100, (xpInCurrentLevel / xpNeeded) * 100)

  return (
    <div className={`rounded-2xl border border-white/50 bg-white/60 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {t('profile.statProgress')}
        </p>
        <span className="text-xs font-semibold uppercase text-purple-600">
        {t('profile.statLevel')} {level}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level ${level} progress: ${Math.round(percentage)}%`}
        />
      </div>
      
      {/* XP text */}
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-600">
          {t('profile.xpTotal', { xp: experiencePoints.toLocaleString() })}
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