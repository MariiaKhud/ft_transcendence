import i18n from '@/lib/i18n'

// Pull the stable `code` field off an ApiClientError's payload, if present.
const getPayloadCode = (payload: unknown): string | null => {
  if (payload && typeof payload === 'object' && 'code' in payload) {
    const code = (payload as { code?: unknown }).code
    return typeof code === 'string' && code.length > 0 ? code : null
  }

  return null
}

// Extract the backend's stable error `code` from a caught API error, if present.
// Useful for callers that need to branch on the code itself (e.g. routing a
// validation error to a specific form field) rather than just its translated text.
export const getApiErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  return getPayloadCode((error as { payload?: unknown }).payload)
}

// Translate a caught API error into a user-facing message: prefers the
// backend's stable error `code` (translated via `api.errors.<code>`) so the
// message respects the active language, and falls back to the raw English
// `error`/`message` text — via the caller-supplied `fallbackMessage` — for
// codes without a translation (e.g. an unmapped edge case).
export const translateApiError = (error: unknown, fallbackMessage: string): string => {
  const code = getApiErrorCode(error)

  if (code && i18n.exists(`api.errors.${code}`)) {
    return i18n.t(`api.errors.${code}`)
  }

  return fallbackMessage
}