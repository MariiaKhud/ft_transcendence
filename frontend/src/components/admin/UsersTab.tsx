import { useState } from 'react'
import type { UserRole } from '@shared/types/user'
import type { AdminUser } from '@/types/admin'
import { useTranslation } from 'react-i18next'

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
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)

  const confirmDelete = async () => {
    if (!deletingUser) return
    await onDeleteUser(deletingUser.id)
    setDeletingUser(null)
  }

  return (
    <section className="mt-6 overflow-x-auto rounded-2xl border border-white/50 bg-white/60">
      <table className="w-full min-w-[600px] text-left">
        <thead className="bg-white/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{t('admin.usersTab.user')}</th>
            <th className="px-4 py-3">{t('admin.usersTab.role')}</th>
            <th className="px-4 py-3">{t('admin.usersTab.articles')}</th>
            <th className="px-4 py-3">{t('admin.usersTab.created')}</th>
            <th className="px-4 py-3">{t('admin.usersTab.action')}</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-white/50">
              <td className="px-4 py-4">
                <p className="font-semibold text-slate-900">
                  {user.displayName}
                </p>
                <p className="text-sm text-slate-500">
                  @{user.username}
                </p>
              </td>

              <td className="px-4 py-4 text-sm text-slate-700">
                {t(`admin.usersTab.roles.${user.role}`)}
              </td>

              <td className="px-4 py-4 text-sm text-slate-700">
                {user.articleCount}
              </td>

              <td className="px-4 py-4 text-sm text-slate-700">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>

              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    disabled={user.id === currentUserId}
                    onChange={(event) =>
                      void onRoleChange(
                        user.id,
                        event.target.value as UserRole,
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="USER">{t('admin.usersTab.roles.USER')}</option>
                    <option value="MODERATOR">{t('admin.usersTab.roles.MODERATOR')}</option>
                    <option value="ADMIN">{t('admin.usersTab.roles.ADMIN')}</option>
                  </select>

                  <button
                    type="button"
                    disabled={user.id === currentUserId || user.role === 'ADMIN'}
                    onClick={() => setDeletingUser(user)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('admin.usersTab.delete')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deletingUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              {t('admin.usersTab.confirmDeleteTitle')}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t('admin.usersTab.confirmDeleteBody', {
                username: deletingUser.username,
              })}
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t('admin.usersTab.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}