  import { useEffect, useRef, useState, useLayoutEffect } from 'react'
  import { createPortal } from 'react-dom'
  import { BookOpen, Heart, Lock, Pen, Sparkles, Trophy, TrendingUp, type LucideIcon } from 'lucide-react'
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
  
  const articleBadgeIcons = new Set(['sparkles', 'pen', 'book-open'])
  const likeBadgeIcons = new Set(['heart', 'trending-up', 'trophy'])
  
  const articleBadgeClass =
    'border-fuchsia-700/60 bg-gradient-to-br from-purple-500 to-fuchsia-800 text-white shadow-lg shadow-purple-950/25'
  
  const likeBadgeClass =
    'border-fuchsia-400 bg-gradient-to-br from-pink-400 to-fuchsia-500 text-white shadow-lg shadow-pink-950/25'
  
  const fallbackBadgeClass =
    'border-white/40 bg-white/50 text-slate-700'
  
  const lockedBadgeClass =
    'border-slate-300/60 bg-slate-100/70 text-slate-400 grayscale'
  
  const allBadgeIcons = Object.keys(badgeIcons).sort(
    (a, b) => (badgeOrder[a] ?? 99) - (badgeOrder[b] ?? 99),
  )
  
  const POPOVER_WIDTH = 224 // w-56
  const POPOVER_GAP = 12 // mt-3 / mb-3
  
  type Placement = 'top' | 'bottom'
  
  type PopoverPosition = {
    top: number
    left: number
    placement: Placement
  }
  
  type BadgeListProps = {
    badges: PublicProfileBadge[]
  }
  
  export function BadgeList({ badges }: BadgeListProps) {
    const { t } = useTranslation()
    const [openIcon, setOpenIcon] = useState<string | null>(null)
    const [position, setPosition] = useState<PopoverPosition | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  
    const badgesByIcon = new Map(badges.map((badge) => [badge.icon, badge]))
  
    const computePosition = (icon: string) => {
      const trigger = triggerRefs.current[icon]
      if (!trigger) return
  
      const rect = trigger.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
  
      // Flip upward only if there isn't enough room below.
      const spaceBelow = viewportHeight - rect.bottom
      const placement: Placement = spaceBelow < 160 ? 'top' : 'bottom'
  
      // Center under/over the badge, clamped so it doesn't run off-screen.
      let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
      left = Math.max(8, Math.min(left, viewportWidth - POPOVER_WIDTH - 8))
  
      const top =
        placement === 'bottom'
          ? rect.bottom + POPOVER_GAP
          : rect.top - POPOVER_GAP
  
      setPosition({ top, left, placement })
    }
  
    const toggleIcon = (icon: string) => {
      if (openIcon === icon) {
        setOpenIcon(null)
        setPosition(null)
        return
      }
      setOpenIcon(icon)
      computePosition(icon)
    }
  
    // Keep the popover glued to its trigger on scroll/resize.
    useLayoutEffect(() => {
      if (!openIcon) return
  
      const handleReposition = () => computePosition(openIcon)
      window.addEventListener('scroll', handleReposition, true)
      window.addEventListener('resize', handleReposition)
      return () => {
        window.removeEventListener('scroll', handleReposition, true)
        window.removeEventListener('resize', handleReposition)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openIcon])
  
    useEffect(() => {
      if (!openIcon) return
  
      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node
        const clickedTrigger = containerRef.current?.contains(target)
        const clickedPopover = document
          .getElementById(`badge-popover-${openIcon}`)
          ?.contains(target)
  
        if (!clickedTrigger && !clickedPopover) {
          setOpenIcon(null)
          setPosition(null)
        }
      }
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpenIcon(null)
          setPosition(null)
        }
      }
  
      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [openIcon])
  
    return (
      <div ref={containerRef} className="relative flex flex-wrap items-start gap-2">
        {allBadgeIcons.map((icon) => {
          const badge = badgesByIcon.get(icon)
          const earned = Boolean(badge)
          const Icon = badgeIcons[icon] ?? Sparkles
          const isOpen = openIcon === icon
  
          const colorClass = !earned
            ? lockedBadgeClass
            : articleBadgeIcons.has(icon)
              ? articleBadgeClass
              : likeBadgeIcons.has(icon)
                ? likeBadgeClass
                : fallbackBadgeClass
  
          const key = badge?.id ?? icon
          const tooltipId = `badge-tooltip-${key}`
          const popoverId = `badge-popover-${icon}`
  
          const badgeName = earned
            ? t(`profile.badgeNames.${badge!.name}`)
            : t('profile.badgeLocked')
  
          const badgeDescription = earned
            ? t(`profile.badgeDescriptions.${badge!.name}`)
            : t(`profile.badgeRequirements.${icon}`)
  
          return (
            <div key={key} className="group relative">
              <span
                ref={(el) => {
                  triggerRefs.current[icon] = el
                }}
                tabIndex={0}
                role="button"
                aria-describedby={tooltipId}
                aria-expanded={isOpen}
                aria-controls={popoverId}
                aria-disabled={!earned}
                onClick={() => toggleIcon(icon)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleIcon(icon)
                  }
                }}
                className={`relative inline-flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl border shadow-sm outline-none backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-md focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2 ${colorClass}`}
              >
                <Icon aria-hidden="true" className="h-9 w-9 stroke-[1.75]" />
  
                {!earned && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white">
                    <Lock aria-hidden="true" className="h-3 w-3 stroke-[2.25] text-slate-400" />
                  </span>
                )}
  
                <span className="sr-only">{badgeName}</span>
  
                {/* Hover tooltip: just the name */}
                {!isOpen && (
                  <span
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 w-max max-w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {badgeName}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </span>
                )}
              </span>
  
              {/* Click popover, portaled to <body> so ancestor overflow-hidden can't clip it */}
              {isOpen && position &&
                createPortal(
                  <div
                    id={popoverId}
                    role="dialog"
                    aria-label={badgeName}
                    style={{
                      position: 'fixed',
                      top: position.top,
                      left: position.left,
                      width: POPOVER_WIDTH,
                      transform: position.placement === 'top' ? 'translateY(-100%)' : undefined,
                    }}
                    className="z-50 cursor-default rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 shadow-xl"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {badgeName}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {badgeDescription}
                    </p>
                    {!earned && (
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-600">
                        {t('profile.badgeLockedLabel')}
                      </p>
                    )}
                  </div>,
                  document.body,
                )}
            </div>
          )
        })}
      </div>
    )
  }