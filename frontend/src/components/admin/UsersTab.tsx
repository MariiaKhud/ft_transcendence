import type { UserRole } from '@shared/types/user'
import type { AdminUser } from '@/types/admin'

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
  return (
    <section className="mt-6 overflow-x-auto rounded-2xl border border-white/50 bg-white/60">
      <table className="w-full min-w-[600px] text-left">
        <thead className="bg-white/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Articles</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Action</th>
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
                {user.role}
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
                  <option value="USER">User</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}