  import { BookOpen, Heart, Pen, Sparkles, Trophy, TrendingUp, type LucideIcon, } from 'lucide-react'
  import type { PublicProfileBadge } from '@/types/profile'
  import { useTranslation } from 'react-i18next'
  
  const badgeIcons: Record<string, LucideIcon> = {
    sparkles: Sparkles,
    pen: Pen,
    'book-open': BookOpen,
    heart: Heart,
    'trending-up': TrendingUp,
    trophy: Trophy,
  }
  
  const badgeOrder: Record<string, number> = {
    sparkles: 1,
    pen: 2,
    'book-open': 3,
    heart: 4,
    'trending-up': 5,
    trophy: 6,
  }

  const articleBadgeIcons = new Set([
    'sparkles',
    'pen',
    'book-open',
  ])
  
  const likeBadgeIcons = new Set([
    'heart',
    'trending-up',
    'trophy',
  ])
  
  const articleBadgeClass =
    'border-fuchsia-700/60 bg-gradient-to-br from-purple-500 to-fuchsia-800 text-white shadow-lg shadow-purple-950/25'

  const likeBadgeClass =
    'border-fuchsia-400 bg-gradient-to-br from-pink-400 to-fuchsia-500 text-white shadow-lg shadow-pink-950/25'

  const fallbackBadgeClass =
    'border-white/40 bg-white/50 text-slate-700'
  
  type BadgeListProps = {
    badges: PublicProfileBadge[]
  }
  
  export function BadgeList({ badges }: BadgeListProps) {
    const { t } = useTranslation()
  
    const sortedBadges = [...badges].sort(
      (a, b) => (badgeOrder[a.icon] ?? 99) - (badgeOrder[b.icon] ?? 99),
    )
  
    return (
      <div className="flex flex-wrap items-start gap-2">
        {sortedBadges.length === 0 ? (
          <p className="text-slate-500">
            {t('profile.noBadges')}
          </p>
        ) : (
          sortedBadges.map((badge) => {
            const Icon = badgeIcons[badge.icon] ?? Sparkles
  
            const colorClass = articleBadgeIcons.has(badge.icon)
              ? articleBadgeClass
              : likeBadgeIcons.has(badge.icon)
                ? likeBadgeClass
                : fallbackBadgeClass
  
            const tooltipId = `badge-tooltip-${badge.id}`
            const badgeName = t(`profile.badgeNames.${badge.name}`)
  
            return (
              <div key={badge.id} className="group relative">
                <span
                  tabIndex={0}
                  aria-describedby={tooltipId}
                  className={`relative inline-flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm outline-none backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-md focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 ${colorClass}`}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-9 w-9 stroke-[1.75]"
                  />
  
                  <span className="sr-only">
                    {badgeName}
                  </span>
  
                  <span
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 w-max max-w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {badgeName}
  
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </span>
                </span>
              </div>
            )
          })
        )}
      </div>
    )
  }