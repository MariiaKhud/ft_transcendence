import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { translateApiError } from '@/lib/api-errors'
import { useStore } from '@/store/store'
import type { UserRole } from '@shared/types/user'

import {
  getAdminArticles,
  getAdminComments,
  getAdminUsers,
  restoreAdminArticle,
  restoreAdminComment,
  updateAdminUserRole,
} from '@/api/admin'

import type {
  AdminArticle,
  AdminComment,
  AdminUser,
} from '@/types/admin'

import { UsersTab } from '@/components/admin/UsersTab'
import { RemovedContentTab } from '@/components/admin/RemovedContentTab'

type Tab = 'content' | 'users'

export function AdminDashboard() {
  const { t } = useTranslation()
  const currentUser = useStore((state) => state.auth.currentUser)

  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [articles, setArticles] = useState<AdminArticle[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'ADMIN'

useEffect(() => {
  if (!isAdmin) {
    setIsLoading(false)
    return
  }

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [articleData, commentData, userData] = await Promise.all([
        getAdminArticles(),
        getAdminComments(),
        getAdminUsers(),
      ])

      setArticles(articleData)
      setComments(commentData)
      setUsers(userData)
    } catch (err) {
      setError(
        translateApiError(err, 'Failed to load admin dashboard'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  void loadDashboard()
}, [isAdmin])

if (!currentUser) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="rounded-2xl bg-slate-100 p-6 text-slate-700">
        {t('common.loading')}
      </p>
    </main>
  )
}

if (!isAdmin) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="rounded-2xl bg-red-50 p-6 text-red-700">
        {t('admin.forbidden')}
      </p>
    </main>
  )
}

  const handleRestoreArticle = async (articleId: string) => {
    await restoreAdminArticle(articleId)
    setArticles((current) =>
      current.filter((article) => article.id !== articleId),
    )
  }

  const handleRestoreComment = async (commentId: string) => {
    await restoreAdminComment(commentId)
    setComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    )
  }

  const handleRoleChange = async ( userId: string, role: UserRole, ) => {
    const updatedUser = await updateAdminUserRole(userId, role)

    setUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, role: updatedUser.role } : user,
      ),
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">
        {t('admin.title')}
      </h1>

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
          {t('admin.removedContent')}
        </button>

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
        <RemovedContentTab
          articles={articles}
          comments={comments}
          onRestoreArticle={handleRestoreArticle}
          onRestoreComment={handleRestoreComment}
        />
      )}

      {!isLoading && !error && activeTab === 'users' && currentUser && (
        <UsersTab
          users={users}
          currentUserId={currentUser.id}
          onRoleChange={handleRoleChange}
        />
      )}
    </main>
  )
}