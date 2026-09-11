import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { UserSearchBar } from '@/components/user/UserSearchBar'
import { NotificationBell } from '@/components/user/NotificationBell'
import type { AuthUser } from '@/types/auth'

interface MobileMenuProps {
  currentUser: AuthUser | null
  hasRestoredSession: boolean
  logout: () => Promise<void>
}

const menuLinkClassName =
  'block \
   rounded-lg \
   px-3 \
   py-2 \
   text-sm \
   font-medium \
   text-slate-700 \
   transition-colors \
   hover:bg-purple-50 \
   hover:text-purple-700'

export function MobileMenu({ currentUser, hasRestoredSession, logout }: MobileMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR'

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const closeMenu = () => setIsOpen(false)

  const handleLogout = () => {
    void (async () => {
      try {
        await logout()
      } finally {
        closeMenu()
        navigate('/login', { replace: true })
      }
    })()
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="rounded-lg
                   p-2
                   text-slate-500
                   transition-colors
                   hover:bg-indigo-100
                   hover:text-slate-900
                   focus:outline-none
                   focus:ring-2
                   focus:ring-blue-500"
      >
        {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute
                     right-0
                     top-full
                     z-50
                     mt-2
                     w-[min(22rem,calc(100vw-2rem))]
                     rounded-2xl
                     border
                     border-white/50
                     bg-white/95
                     p-3
                     shadow-xl
                     backdrop-blur-md"
        >
          <div className="mb-2">
            <UserSearchBar key={currentUser?.id ?? 'guest'} />
          </div>

          <Link to="/leaderboard" onClick={closeMenu} className={menuLinkClassName} role="menuitem">
            {t('nav.leaderboard')}
          </Link>

          {currentUser ? (
            <>
              <div
                className="flex
                           cursor-pointer
                           items-center
                           justify-between
                           rounded-lg
                           px-3
                           py-1
                           text-sm
                           font-medium
                           text-slate-700
                           transition-colors
                           hover:bg-purple-50
                           hover:text-purple-700"
                role="menuitem"
                tabIndex={0}
                onClick={() => {
                  closeMenu()
                  navigate('/notifications')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    closeMenu()
                    navigate('/notifications')
                  }
                }}
              >
                <span>{t('notification.title')}</span>
                <NotificationBell navigationOnly />
              </div>

              <Link to="/articles/new" onClick={closeMenu} className={menuLinkClassName} role="menuitem">
                {t('nav.write')}
              </Link>

              <div className="my-2 border-t border-slate-200" />

              <Link
                to={`/profile/${currentUser.username}`}
                onClick={closeMenu}
                className={menuLinkClassName}
                role="menuitem"
              >
                {t('nav.profile')}
              </Link>

              <Link
                to="/settings/profile"
                onClick={closeMenu}
                className={menuLinkClassName}
                role="menuitem"
              >
                {t('nav.settings')}
              </Link>

              <Link to="/friends" onClick={closeMenu} className={menuLinkClassName} role="menuitem">
                {t('profile.friends')}
              </Link>

              {isStaff ? (
                <Link to="/admin" onClick={closeMenu} className={menuLinkClassName} role="menuitem">
                  {t('admin.title')}
                </Link>
              ) : null}

              <div className="my-2 border-t border-slate-200" />

              <button
                type="button"
                onClick={handleLogout}
                className={`${menuLinkClassName} text-left
                                                 text-red-600
                                                 hover:bg-red-50
                                                 hover:text-red-700`}
                role="menuitem"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : hasRestoredSession ? (
            <Link
              to="/login"
              onClick={closeMenu}
              className="mt-1
                         block
                         rounded-lg
                         bg-gradient-to-r
                         from-purple-600
                         to-pink-600
                         px-3
                         py-2
                         text-center
                         text-sm
                         font-medium
                         text-white
                         shadow-lg"
              role="menuitem"
            >
              {t('nav.login')}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
