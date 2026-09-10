import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '@/lib/i18n'
import { useStore } from '@/store/store'
import { updateMyProfile } from '@/api/users'

const LANGUAGE_ORDER: SupportedLanguage[] = ['nl', 'en', 'uk']

const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  nl: 'NL',
  en: 'EN',
  uk: 'UA',
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  nl: 'Nederlands',
  uk: 'Українська',
}

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  const currentUser = useStore((state) => state.auth.currentUser)
  const setCurrentUser = useStore((state) => state.authActions.setCurrentUser)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const resolvedLanguage = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage
  const activeLanguage = supportedLanguages.includes(resolvedLanguage) ? resolvedLanguage : 'en'

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSelect = (language: SupportedLanguage) => {
    void i18n.changeLanguage(language)
    setOpen(false)

    // Sync to the account so the choice carries across devices.
    // Best-effort: the switch itself already applied locally either way.
    if (currentUser) {
      updateMyProfile({ preferredLanguage: language }).then(setCurrentUser).catch(() => {})
    }
  }

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={t('languageSwitcher.label')}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('languageSwitcher.label')}
        className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-indigo-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {LANGUAGE_CODES[activeLanguage]}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('languageSwitcher.label')}
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          {LANGUAGE_ORDER.map((language) => {
            const isActive = activeLanguage === language

            return (
              <button
                key={language}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleSelect(language)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-50 font-semibold text-purple-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{LANGUAGE_NAMES[language]}</span>
                <span className="text-xs text-slate-400">{LANGUAGE_CODES[language]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
