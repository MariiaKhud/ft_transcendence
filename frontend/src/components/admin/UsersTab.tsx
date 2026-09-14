import { useState } from 'react'
import type { UserRole } from '@shared/types/user'
import type { AdminUser } from '@/types/admin'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react'
import { UserAvatar } from '@/components/user/UserAvatar'
import { useTopRanks } from '@/hooks/useTopRanks'
import { translateApiError } from '@/lib/api-errors'
import { formatLocalizedDate } from '@/lib/date-format'

// Prefers the backend's own reason (e.g. "Cannot demote another
// administrator") over the generic fallback, while still letting a stable
// error `code` take priority when one is present.
const describeActionError = (err: unknown, fallback: string) =>
  translateApiError(err, err instanceof Error && err.message ? err.message : fallback)

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MODERATOR: 'bg-blue-100 text-blue-700',
  USER: 'bg-slate-100 text-slate-600',
}

type UsersTabProps = {
  users: AdminUser[]
  currentUserId: string
  onRoleChange: (
    userId: string,
    role: UserRole,
  ) => Promise<void>
  onDeleteUser: (userId: string) => Promise<void>
}

export function UsersTab({
  users,
  currentUserId,
  onRoleChange,
  onDeleteUser,
}: UsersTabProps) {
  const { t } = useTranslation()
  const topRanks = useTopRanks()
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: AdminUser
    role: UserRole
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const closeDeleteModal = () => {
    setDeletingUser(null)
    setActionError(null)
  }

  const closeRoleChangeModal = () => {
    setPendingRoleChange(null)
    setActionError(null)
  }

  const confirmDelete = async () => {
    if (!deletingUser) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      await onDeleteUser(deletingUser.id)
      setDeletingUser(null)
    } catch (err) {
      setActionError(describeActionError(err, t('admin.usersTab.actionFailed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      await onRoleChange(pendingRoleChange.user.id, pendingRoleChange.role)
      setPendingRoleChange(null)
    } catch (err) {
      setActionError(describeActionError(err, t('admin.usersTab.actionFailed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/60 shadow-sm">
      <table className="w-full min-w-[680px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-center">{t('admin.usersTab.user')}</th>
            <th className="px-4 py-3 text-center">{t('admin.usersTab.role')}</th>
            <th className="px-4 py-3 text-center">{t('admin.usersTab.articles')}</th>
            <th className="px-4 py-3 text-center">{t('admin.usersTab.created')}</th>
            <th className="px-4 py-3 text-center">{t('admin.usersTab.action')}</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const isSelf = user.id === currentUserId
            return (
              <tr key={user.id} className="transition-colors hover:bg-purple-50/40">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarUrl={user.avatarUrl} username={user.username} size="small" rank={topRanks.get(user.id)} />
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-slate-900">
                        {user.displayName ?? user.username}
                        {isSelf && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                            {t('admin.usersTab.you')}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">@{user.username}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_STYLES[user.role]}`}
                  >
                    {t(`admin.usersTab.roles.${user.role}`)}
                  </span>
                </td>

                <td className="px-4 py-4 text-center text-sm text-slate-700">
                  {user.articleCount}
                </td>

                <td className="px-4 py-4 text-center text-sm text-slate-700">
                  {formatLocalizedDate(user.createdAt)}
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <select
                      value={user.role}
                      disabled={isSelf || user.role === 'ADMIN'}
                      onChange={(event) => {
                        const role = event.target.value as UserRole
                        if (role === user.role) return
                        setActionError(null)
                        setPendingRoleChange({ user, role })
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="USER">{t('admin.usersTab.roles.USER')}</option>
                      <option value="MODERATOR">{t('admin.usersTab.roles.MODERATOR')}</option>
                      <option value="ADMIN">{t('admin.usersTab.roles.ADMIN')}</option>
                    </select>

                    <button
                      type="button"
                      disabled={isSelf || user.role === 'ADMIN'}
                      onClick={() => {
                        setActionError(null)
                        setDeletingUser(user)
                      }}
                      title={t('admin.usersTab.delete')}
                      aria-label={t('admin.usersTab.delete')}
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {pendingRoleChange && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('admin.usersTab.confirmRoleChangeTitle')}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {t('admin.usersTab.confirmRoleChangeBody', {
                    username: pendingRoleChange.user.username,
                    fromRole: t(`admin.usersTab.roles.${pendingRoleChange.user.role}`),
                    toRole: t(`admin.usersTab.roles.${pendingRoleChange.role}`),
                  })}
                </p>
                {pendingRoleChange.role === 'ADMIN' && (
                  <p className="mt-2 rounded-lg bg-purple-50 p-2 text-sm text-purple-700">
                    {t('admin.usersTab.confirmPromoteAdminWarning')}
                  </p>
                )}
                {actionError && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                    {actionError}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRoleChangeModal}
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmRoleChange()}
                disabled={isSubmitting}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t('common.saving') : t('admin.usersTab.confirmRoleChangeButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {t('admin.usersTab.confirmDeleteTitle')}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {t('admin.usersTab.confirmDeleteBody', {
                    username: deletingUser.username,
                  })}
                </p>
                {actionError && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                    {actionError}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t('common.deleting') : t('admin.usersTab.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}