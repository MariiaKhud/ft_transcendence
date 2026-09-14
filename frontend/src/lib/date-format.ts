import i18n from '@/lib/i18n'

// `Date#toLocaleDateString`/`toLocaleString` fall back to the browser's own
// locale when called with no explicit locale argument, so they ignore an
// in-app language switch whenever it diverges from the OS/browser language.
// These pass the currently active i18next language instead, so date
// formatting follows the same language as the rest of the UI.
export const formatLocalizedDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string =>
  new Date(dateStr).toLocaleDateString(i18n.language, options)

export const formatLocalizedDateTime = (dateStr: string, options?: Intl.DateTimeFormatOptions): string =>
  new Date(dateStr).toLocaleString(i18n.language, options)
