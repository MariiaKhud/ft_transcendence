import type { AdminArticle } from '@/types/admin'
import { useTranslation } from 'react-i18next'

type RemovedArticlesTabProps = {
  articles: AdminArticle[]
  onRestoreArticle: (id: string) => Promise<void>
}

export function RemovedArticlesTab({ articles, onRestoreArticle, }: RemovedArticlesTabProps) {
  const { t } = useTranslation()

  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-white/50 bg-white/60 p-6">
        <h2 className="text-xl font-bold text-slate-900">
        {t('admin.removedArticles')}
        </h2>

        <div className="mt-4 space-y-3">
          {articles.length === 0 ? (
            <p className="text-slate-500">
              {t('admin.noRemovedArticles')}
            </p>
          ) : (
            articles.map((article) => (
              <div
                key={article.id}
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <h3 className="font-bold text-slate-900">
                  {article.title}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  {t('admin.contentBy', {
                    username: article.author?.username,
                  })}
                </p>

                <p className="mt-3 text-sm text-red-700">
                  {t('admin.removedReason', {
                    reason: article.removedReason,
                  })}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                {t('admin.removedAt', {
                    date: article.removedAt
                      ? new Date(article.removedAt).toLocaleString()
                      : t('admin.unknownDate'),
                  })}
                </p>

                <button
                  type="button"
                  onClick={() => void onRestoreArticle(article.id)}
                  className="mt-4 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  {t('admin.restoreArticle')}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}