import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '@/lib/i18n'

// Language names are shown in their own language (endonyms), not translated —
// a Ukrainian speaker looking for "Dutch" scans for "Nederlands", not a
// translated word, and every language switcher on the web works this way.
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  nl: 'Nederlands',
  uk: 'Українська',
}

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  const activeLanguage = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-switcher" className="sr-only">
        {t('languageSwitcher.label')}
      </label>
      <select
        id="language-switcher"
        value={supportedLanguages.includes(activeLanguage) ? activeLanguage : 'en'}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value)
        }}
        aria-label={t('languageSwitcher.label')}
        className="rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-sm text-slate-600 transition-colors hover:border-purple-300 hover:bg-white focus:border-purple-500 focus:outline-none"
      >
        {supportedLanguages.map((language) => (
          <option key={language} value={language}>
            {LANGUAGE_NAMES[language]}
          </option>
        ))}
      </select>
    </div>
  )
}