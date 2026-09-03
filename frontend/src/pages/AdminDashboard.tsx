import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { translateApiError } from '@/lib/api-errors'
import { useStore } from '@/store/store'
import { StatCard } from '@/components/admin/StatCard'
import { DashboardRefreshButton } from '@/components/admin/DashboardRefreshButton'
import type { UserRole } from '@shared/types/user'

import {
  getAdminArticles,
  getAdminComments,
  getAdminUsers,
  restoreAdminArticle,
  restoreAdminComment,
  updateAdminUserRole,
  removeAdminArticle,
} from '@/api/admin'

import type {
  AdminArticle,
  AdminComment,
  AdminUser,
} from '@/types/admin'

import { UsersTab } from '@/components/admin/UsersTab'
import { RemovedArticlesTab } from '@/components/admin/RemovedArticlesTab'
import { RemovedCommentsTab } from '@/components/admin/RemovedCommentsTab'
import { ContentTab } from '@/components/admin/ContentTab'

type Tab = 'content' | 'removed_articles' | 'removed_comments' | 'users'

export function AdminDashboard() {
  const { t } = useTranslation()
  const currentUser = useStore((state) => state.auth.currentUser)

  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [allArticles, setAllArticles] = useState<AdminArticle[]>([])
  const [removedArticles, setRemovedArticles] = useState<AdminArticle[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'ADMIN'
  const isModerator = currentUser?.role === 'MODERATOR'
  const canAccess = isAdmin || isModerator

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [articleData, commentData, userData] = await Promise.all([
        getAdminArticles(),
        getAdminComments(),
        isAdmin ? getAdminUsers() : Promise.resolve([] as AdminUser[]),
      ])

      // All non-removed articles
      setAllArticles(articleData.filter((a) => !a.isRemoved))

      // Only removed ones
      setRemovedArticles(articleData.filter((a) => a.isRemoved))

      setComments(commentData)
      if (isAdmin)
        setUsers(userData)
    } catch (err) {
      setError(
        translateApiError(err, 'Failed to load admin dashboard'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load when admin status is known
  useEffect(() => {
    if (!canAccess) {
      setIsLoading(false)
      return
    }

    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!canAccess])

  // Re-load data whenever the active tab changes (only if admin)
  useEffect(() => {
    if (!canAccess) 
        return
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, !canAccess])

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="rounded-2xl bg-slate-100 p-6 text-slate-700">
          {t('common.loading')}
        </p>
      </main>
    )
  }

  if (!canAccess) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="rounded-2xl bg-red-50 p-6 text-red-700">
          {t('admin.forbidden')}
        </p>
      </main>
    )
  }

  const handleRestoreArticle = async (articleId: string) => {
    const article = removedArticles.find((a) => a.id === articleId)
    if (!article) return

    await restoreAdminArticle(articleId)

    // Remove from removedArticles
    setRemovedArticles((current) =>
      current.filter((a) => a.id !== articleId),
    )

    // Update in allArticles to mark as not removed
    setAllArticles((current) =>
      current.map((a) =>
        a.id === articleId
          ? { ...a, isRemoved: false, removedReason: null, removedAt: null }
          : a,
      ),
    )
  }

  const handleRemoveArticle = async (
    articleId: string,
    reason: string,
  ) => {
    const removedArticle = await removeAdminArticle(articleId, reason)

    // Update allArticles
    setAllArticles((current) =>
      current.map((a) =>
        a.id === articleId
          ? {
              ...a,
              isRemoved: true,
              removedReason: removedArticle.removedReason,
              removedAt: removedArticle.removedAt,
            }
          : a,
      ),
    )

    // Add to removedArticles using the real server object
    setRemovedArticles((current) => [removedArticle, ...current])
  }

  const handleRestoreComment = async (commentId: string) => {
    await restoreAdminComment(commentId)
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    )
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const updatedUser = await updateAdminUserRole(userId, role)

    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, role: updatedUser.role } : user,
      ),
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            {t('admin.title')}
          </h1>

          <DashboardRefreshButton onRefresh={() => void loadDashboard()} isLoading={isLoading} />
        </div>
        {/* Stats row */}
        {!error && canAccess && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {/* Active articles */}
            <StatCard
              label={t('admin.activeArticles')}
              value={allArticles.length}
            />

            {/* Removed articles */}
            <StatCard
              label={t('admin.removedArticles')}
              value={removedArticles.length}
            />

            {/* Removed comments */}
            <StatCard
              label={t('admin.removedComments')}
              value={comments.length}
            />

            {/* Users (admin only) */}
            {isAdmin && (
              <StatCard
                label={t('admin.totalUsers')}
                value={users.length}
              />
            )}

            {/* Example: moderators count */}
            {isAdmin && (
              <StatCard
                label={t('admin.moderators')}
                value={users.filter((u) => u.role === 'MODERATOR').length}
              />
            )}

            {/* Example: admins count */}
            {isAdmin && (
              <StatCard
                label={t('admin.admins')}
                value={users.filter((u) => u.role === 'ADMIN').length}
              />
            )}
          </div>
        )}

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`rounded-t-xl px-4 py-3 text-sm font-semibold ${
            activeTab === 'content'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('admin.content')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('removed_articles')}
          className={`rounded-t-xl px-4 py-3 text-sm font-semibold ${
            activeTab === 'removed_articles'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('admin.removedArticles')} 
        </button>

        <button
        type="button"
          onClick={() => setActiveTab('removed_comments')}
          className={`rounded-t-xl px-4 py-3 text-sm font-semibold ${
            activeTab === 'removed_comments'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('admin.removedComments')} 
        </button>

        {isAdmin && (
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`rounded-t-xl px-4 py-3 text-sm font-semibold ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t('admin.users')}
        </button> 
        )}
      </div>

      {isLoading && (
        <p className="mt-6 text-slate-600">
          {t('common.loading')}
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {!isLoading && !error && activeTab === 'content' && (
        <ContentTab
          articles={allArticles}
          onRemoveArticle={handleRemoveArticle}
        />
      )}

      {!isLoading && !error && activeTab === 'removed_articles' && (
        <RemovedArticlesTab
          articles={removedArticles}
          onRestoreArticle={handleRestoreArticle}
        />
      )}

      {!isLoading && !error && activeTab === 'removed_comments' && (
        <RemovedCommentsTab
          comments={comments}
          onRestoreComment={handleRestoreComment}
        />
      )}

      {!isLoading && !error && activeTab === 'users' && isAdmin && currentUser && (
        <UsersTab
          users={users}
          currentUserId={currentUser.id}
          onRoleChange={handleRoleChange}
        />
      )}
    </main>
  )
}