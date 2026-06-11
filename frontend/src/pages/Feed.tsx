import { useAuthStore } from '@/store/authStore'

export function Feed() {
  const user = useAuthStore(function selectUser(state) {
    return state.user
  })

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Global Feed</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Welcome to Feed</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          {user
            ? `Hello ${user.displayName ?? user.username}, discover the latest activity from your network.`
            : 'Discover the latest activity from your network.'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <p className="text-slate-700">
          This is your feed area. Next, you can render posts, comments, and friend activity here.
        </p>
      </div>
    </section>
  )
}
