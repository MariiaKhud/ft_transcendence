import { useStore } from '@/store/store'

export const Feed = () => {
  // Read current user from global store.
  const user = useStore((state) => {
    return state.auth.currentUser
  })

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Feed header */}
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Global Feed</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Welcome to Feed</h1>
        <p className="mx-auto max-w-2xl text-slate-600">
          {user
            ? `Hello ${user.displayName ?? user.username}, discover the latest activity from your network.`
            : 'Discover the latest activity from your network.'}
        </p>
      </div>

      {/* Feed placeholder */}
      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <p className="text-slate-700">
          This is your feed area. Next, you can render posts, comments, and friend activity here.
        </p>
      </div>
    </section>
  )
}
