import { useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatCategoryLabel } from '@/lib/article-display'
import { getApiErrorCode } from '@/lib/api-errors'

const CATEGORIES = ['PROGRAMMING', 'CAREER', 'STUDY_NOTES', 'PROJECTS', 'LIFE', 'OPINION']

const TITLE_MAX_LENGTH = 120
const CONTENT_MIN_LENGTH = 100
const CONTENT_MAX_LENGTH = 10000

// Mirrors the backend's minimum-length check: count only non-whitespace characters
// so the requirement can't be satisfied by padding with whitespace — leading,
// trailing, or between real characters. The maximum still uses raw length, which
// is a payload-size cap rather than an effort signal.
const countNonWhitespaceChars = (value: string): number => value.replace(/\s+/g, '').length

export interface ArticleFormValues {
  title: string
  content: string
  category: string
}

// An error is either a translation key + params (re-resolved on every render so it
// follows language switches — used for both client validation and known API error
// codes) or an already-resolved message string (used when there's no matching code,
// e.g. a network failure).
type FieldError = { key: string; params?: Record<string, unknown> } | string | null

// Backend validation codes (see articles.route-helpers.ts) that concern each field —
// used to route a caught API error to the right field without parsing its text.
const TITLE_ERROR_CODES = new Set(['validation_title_required', 'validation_title_invalid', 'validation_title_max_length'])
const CONTENT_ERROR_CODES = new Set([
  'validation_content_required',
  'validation_content_invalid',
  'validation_content_min_length',
  'validation_content_max_length',
])

interface ArticleFormProps {
  initialValues?: ArticleFormValues
  submitLabel: string
  isSubmitting: boolean
  onSubmit: (values: ArticleFormValues) => Promise<void>
  onCancel?: () => void
}

/**
 * Shared form for creating and editing an article: title input, category
 * select, and a Markdown textarea with a write/preview toggle.
 */
export const ArticleForm = ({ initialValues, submitLabel, isSubmitting, onSubmit, onCancel }: ArticleFormProps) => {
  const { t, i18n } = useTranslation()
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [category, setCategory] = useState(initialValues?.category ?? CATEGORIES[0])
  const [showPreview, setShowPreview] = useState(false)

  const [titleError, setTitleError] = useState<FieldError>(null)
  const [contentError, setContentError] = useState<FieldError>(null)
  const [formError, setFormError] = useState<FieldError>(null)

  // Resolve a FieldError for display: translation keys are re-translated on every
  // render (so they follow language switches), API messages are shown as-is.
  const resolveFieldError = (error: FieldError): string => {
    if (!error) return ''
    return typeof error === 'string' ? error : t(error.key, error.params)
  }

  // Route a caught API error to the field it concerns, by its stable backend code
  // (not by parsing translated text — that breaks once the UI isn't in English).
  // A known code is stored as a translation key so it stays reactive to language
  // switches; anything else falls back to the resolved message as plain text.
  const applyApiError = (err: unknown) => {
    const code = getApiErrorCode(err)

    if (code && i18n.exists(`api.errors.${code}`)) {
      const fieldError: FieldError = { key: `api.errors.${code}` }

      if (TITLE_ERROR_CODES.has(code)) {
        setTitleError(fieldError)
        return
      }

      if (CONTENT_ERROR_CODES.has(code)) {
        setContentError(fieldError)
        return
      }

      setFormError(fieldError)
      return
    }

    setFormError(err instanceof Error ? err.message : t('articleForm.errors.unableToSave'))
  }

  const validate = (): boolean => {
    let isValid = true
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (trimmedTitle.length === 0) {
      setTitleError({ key: 'articleForm.errors.titleRequired' })
      isValid = false
    } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      setTitleError({ key: 'articleForm.errors.titleMaxLength', params: { max: TITLE_MAX_LENGTH } })
      isValid = false
    }

    if (trimmedContent.length === 0) {
      setContentError({ key: 'articleForm.errors.contentRequired' })
      isValid = false
    } else if (countNonWhitespaceChars(trimmedContent) < CONTENT_MIN_LENGTH) {
      setContentError({ key: 'articleForm.errors.contentMinLength', params: { min: CONTENT_MIN_LENGTH } })
      isValid = false
    } else if (trimmedContent.length > CONTENT_MAX_LENGTH) {
      setContentError({ key: 'articleForm.errors.contentMaxLength', params: { max: CONTENT_MAX_LENGTH } })
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setTitleError(null)
    setContentError(null)
    setFormError(null)

    if (!validate()) {
      return
    }

    try {
      await onSubmit({ title: title.trim(), content: content.trim(), category })
    } catch (err) {
      applyApiError(err)
    }
  }

  // Whitespace (anywhere — leading, trailing, or padding between real characters)
  // counts toward the raw counter but not toward the minimum-length check, which
  // can make the counter look satisfied when it isn't. Surface the real count
  // whenever that's the case, not just when the padding happens to be at the edges.
  const nonWhitespaceContentLength = countNonWhitespaceChars(content)
  const showValidCharsHint = nonWhitespaceContentLength !== content.length && nonWhitespaceContentLength < CONTENT_MIN_LENGTH

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="article-title" className="block text-sm font-semibold text-slate-900">
          {t('articleForm.titleLabel')}
        </label>
        <input
          id="article-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleError(null)
          }}
          maxLength={TITLE_MAX_LENGTH}
          placeholder={t('articleForm.titlePlaceholder')}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none"
        />
        <p className={`text-right text-xs ${title.length > TITLE_MAX_LENGTH * 0.9 ? 'text-pink-500' : 'text-slate-400'}`}>
          {t('common.counter', { count: title.length, max: TITLE_MAX_LENGTH })}
        </p>
        {titleError && <p className="text-xs font-medium text-pink-600">{resolveFieldError(titleError)}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="article-category" className="block text-sm font-semibold text-slate-900">
          {t('articleForm.categoryLabel')}
        </label>
        <select
          id="article-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-purple-500 focus:outline-none"
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {formatCategoryLabel(value)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="article-content" className="block text-sm font-semibold text-slate-900">
            {t('articleForm.contentLabel')}
          </label>
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                !showPreview ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('articleForm.write')}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                showPreview ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('articleForm.preview')}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="prose prose-slate min-h-[16rem] max-w-none break-words rounded-lg border border-slate-300 px-4 py-3">
            {content.trim().length > 0 ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <p className="text-slate-400">{t('articleForm.nothingToPreview')}</p>
            )}
          </div>
        ) : (
          <textarea
            id="article-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setContentError(null)
            }}
            rows={14}
            maxLength={CONTENT_MAX_LENGTH}
            placeholder={t('articleForm.contentPlaceholder')}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none"
          />
        )}
        <p className={`text-right text-xs ${content.length > CONTENT_MAX_LENGTH * 0.9 ? 'text-pink-500' : 'text-slate-400'}`}>
          {t('common.counter', { count: content.length, max: CONTENT_MAX_LENGTH })}
        </p>
        {showValidCharsHint && (
          <p className="text-right text-xs text-amber-600">
            {t('articleForm.validCharactersHint', { count: nonWhitespaceContentLength, min: CONTENT_MIN_LENGTH })}
          </p>
        )}
        {contentError && <p className="text-xs font-medium text-pink-600">{resolveFieldError(contentError)}</p>}
      </div>

      {formError && (
        <p className="rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
          {resolveFieldError(formError)}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {isSubmitting ? t('articleForm.saving') : submitLabel}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
          >
            {t('articleForm.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
