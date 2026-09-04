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
}

export function UsersTab({
  users,
  currentUserId,
  onRoleChange,
}: UsersTabProps) {
  const { t } = useTranslation()

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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}