import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '@/locales/en/translation.json'
import nl from '@/locales/nl/translation.json'
import uk from '@/locales/uk/translation.json'

export const supportedLanguages = ['en', 'nl', 'uk'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      nl: { translation: nl },
      uk: { translation: uk },
    },
    supportedLngs: supportedLanguages,
    fallbackLng: 'en',
    interpolation: {
      // React already escapes rendered values.
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

// Switch to a logged-in user's saved language preference, so it carries
// across devices/browsers instead of relying only on this browser's
// localStorage. Guests (and accounts with no preference set) keep whatever
// localStorage/browser-detection already resolved — see LanguageDetector
// above. Called after login and after session restore.
export const applyPreferredLanguage = (preferredLanguage: string | null | undefined) => {
  if (
    preferredLanguage &&
    supportedLanguages.includes(preferredLanguage as SupportedLanguage) &&
    i18n.language !== preferredLanguage
  ) {
    void i18n.changeLanguage(preferredLanguage)
  }
}

export default i18n
