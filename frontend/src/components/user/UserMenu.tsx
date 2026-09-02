// src/components/user/UserMenu.tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '@/types/auth' // adjust to your actual type location

type UserMenuProps = {
  currentUser: AuthUser
  logout: () => Promise<void>
}

const menuItemClassName = `
  block
  w-full
  px-4
  py-2
  text-left
  text-sm
  text-slate-700
  hover:bg-purple-50
  hover:text-purple-700
`

export function UserMenu({ currentUser, logout }: UserMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isStaff = currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR'

  // Close the menu on outside click.
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close the menu on route change (e.g. after clicking a link inside it).
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="
          inline-flex
          items-center
          justify-center
          gap-1.5
          rounded-full
          border
          border-fuchsia-300/60
          bg-gradient-to-r
          from-fuchsia-100
          to-purple-100
          px-4
          py-2
          text-sm
          font-semibold
          text-fuchsia-800
          shadow-sm
          transition-all
          hover:scale-105
        "
      >
        {(currentUser.displayName ?? currentUser.username).slice(0, 6)}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="
            absolute
            right-0
            top-full
            z-30
            mt-2
            w-48
            overflow-hidden
            rounded-xl
            border
            border-white/50
            bg-white/95
            py-1
            shadow-lg
            backdrop-blur-md
          "
        >
          <Link
            to={`/profile/${currentUser.username}`}
            onClick={closeMenu}
            className={menuItemClassName}
            role="menuitem"
          >
            {t('nav.profile')}
          </Link>

          <Link
            to="/settings/profile"
            onClick={closeMenu}
            className={menuItemClassName}
            role="menuitem"
          >
            {t('nav.settings')}
          </Link>

          {isStaff ? (
            <Link
              to="/admin"
              onClick={closeMenu}
              className={menuItemClassName}
              role="menuitem"
            >
              {t('admin.title')}
            </Link>
          ) : null}

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={handleLogout}
            className={`${menuItemClassName} text-red-600 hover:bg-red-50 hover:text-red-700`}
            role="menuitem"
          >
            {t('nav.logout')}
          </button>
        </div>
      ) : null}
    </div>
  )
}