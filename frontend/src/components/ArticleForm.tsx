import { useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatCategoryLabel } from '@/lib/article-display'
import { translateApiError } from '@/lib/api-errors'

const CATEGORIES = ['PROGRAMMING', 'CAREER', 'STUDY_NOTES', 'PROJECTS', 'LIFE', 'OPINION']

const TITLE_MAX_LENGTH = 120
const CONTENT_MIN_LENGTH = 100

export interface ArticleFormValues {
  title: string
  content: string
  category: string
}

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
  const { t } = useTranslation()
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [category, setCategory] = useState(initialValues?.category ?? CATEGORIES[0])
  const [showPreview, setShowPreview] = useState(false)

  const [titleError, setTitleError] = useState('')
  const [contentError, setContentError] = useState('')
  const [formError, setFormError] = useState('')

  // Map an API error message to the field it concerns, same pattern as EditProfile.
  const applyApiError = (message: string) => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('title')) {
      setTitleError(message)
      return
    }

    if (lowerMessage.includes('content')) {
      setContentError(message)
      return
    }

    setFormError(message)
  }

  const validate = (): boolean => {
    let isValid = true
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (trimmedTitle.length === 0) {
      setTitleError(t('articleForm.errors.titleRequired'))
      isValid = false
    } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      setTitleError(t('articleForm.errors.titleMaxLength', { max: TITLE_MAX_LENGTH }))
      isValid = false
    }

    if (trimmedContent.length === 0) {
      setContentError(t('articleForm.errors.contentRequired'))
      isValid = false
    } else if (trimmedContent.length < CONTENT_MIN_LENGTH) {
      setContentError(t('articleForm.errors.contentMinLength', { min: CONTENT_MIN_LENGTH }))
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    setTitleError('')
    setContentError('')
    setFormError('')

    if (!validate()) {
      return
    }

    try {
      await onSubmit({ title: title.trim(), content: content.trim(), category })
    } catch (err) {
      applyApiError(translateApiError(err, err instanceof Error ? err.message : t('articleForm.errors.unableToSave')))
    }
  }

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
            setTitleError('')
          }}
          maxLength={TITLE_MAX_LENGTH}
          placeholder={t('articleForm.titlePlaceholder')}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none"
        />
        <p className="text-right text-xs text-slate-400">
          {t('common.counter', { count: title.length, max: TITLE_MAX_LENGTH })}
        </p>
        {titleError.length > 0 && <p className="text-xs font-medium text-red-500">{titleError}</p>}
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
              setContentError('')
            }}
            rows={14}
            placeholder={t('articleForm.contentPlaceholder')}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none"
          />
        )}
        <p className="text-right text-xs text-slate-400">
          {t('articleForm.contentCounter', { count: content.trim().length, min: CONTENT_MIN_LENGTH })}
        </p>
        {contentError.length > 0 && <p className="text-xs font-medium text-red-500">{contentError}</p>}
      </div>

      {formError.length > 0 && (
        <p className="rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
          {formError}
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
