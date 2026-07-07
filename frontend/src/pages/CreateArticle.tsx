import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArticleForm, type ArticleFormValues } from '@/components/ArticleForm'
import { createArticle } from '@/api/articles'
import { useAuth } from '@/hooks/useAuth'

export const CreateArticle = () => {
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
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
          <p className="text-slate-700">Checking your session...</p>
        </div>
      </section>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Write an Article</h1>
        <p className="text-slate-600">Share something with the community</p>
      </div>

      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <ArticleForm submitLabel="Publish" isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </div>
    </section>
  )
}
