import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArticleForm, type ArticleFormValues } from '@/components/ArticleForm'
import { GlassPanel } from '@/components/ui/glass-panel'
import { createArticle } from '@/api/articles'
import { useAuth } from '@/hooks/useAuth'

export const CreateArticle = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, hasRestoredSession, isLoading } = useAuth({ restoreOnMount: true })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (values: ArticleFormValues) => {
    setIsSubmitting(true)

    try {
      const created = await createArticle(values)
      navigate(`/articles/${created.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hasRestoredSession || isLoading) {
    return (
      <section className="mx-auto w-full max-w-3xl space-y-8">
        <GlassPanel>
          <p className="text-slate-700">{t('common.checkingSession')}</p>
        </GlassPanel>
      </section>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t('createArticle.title')}</h1>
        <p className="text-slate-600">{t('createArticle.subtitle')}</p>
      </div>

      <GlassPanel>
        <ArticleForm submitLabel={t('createArticle.publish')} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </GlassPanel>
    </section>
  )
}
