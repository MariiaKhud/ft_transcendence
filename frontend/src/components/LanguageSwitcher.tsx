import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '@/lib/i18n'
import { useStore } from '@/store/store'
import { updateMyProfile } from '@/api/users'

// Order and short codes as buttons, not endonyms — this is a compact
// top-bar control, not the old dropdown.
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
  const resolvedLanguage = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage
  const activeLanguage = supportedLanguages.includes(resolvedLanguage) ? resolvedLanguage : 'en'

  const handleSelect = (language: SupportedLanguage) => {
    void i18n.changeLanguage(language)

    // Sync to the account so the choice carries across devices.
    // Best-effort: the switch itself already applied locally either way.
    if (currentUser) {
      updateMyProfile({ preferredLanguage: language }).then(setCurrentUser).catch(() => {})
    }
  }

  return (
    <div
      role="group"
      aria-label={t('languageSwitcher.label')}
      className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white/70 p-1"
    >
      {LANGUAGE_ORDER.map((language) => {
        const isActive = activeLanguage === language
        return (
          <button
            key={language}
            type="button"
            onClick={() => handleSelect(language)}
            aria-pressed={isActive}
            aria-label={LANGUAGE_NAMES[language]}
            title={LANGUAGE_NAMES[language]}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-purple-100 text-purple-700'
                : 'text-slate-600 hover:bg-white hover:text-purple-700'
            }`}
          >
            {LANGUAGE_CODES[language]}
          </button>
        )
      })}
    </div>
  )
}
