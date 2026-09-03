
import type { AdminComment } from '@/types/admin'

type RemovedCommentsTabProps = {
  comments: AdminComment[]
  onRestoreComment: (id: string) => Promise<void>
}

export function RemovedCommentsTab({
  comments,
  onRestoreComment,
}: RemovedCommentsTabProps) {
  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-white/50 bg-white/60 p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Removed comments
        </h2>

        <div className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-slate-500">
              No removed comments.
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="text-slate-800">
                  {comment.content}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  By {comment.author?.username}
                </p>

                <p className="mt-3 text-sm text-red-700">
                  Reason: {comment.removedReason}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Removed at:{' '}
                  {comment.removedAt
                    ? new Date(comment.removedAt).toLocaleString()
                    : 'Unknown'}
                </p>

                <button
                  type="button"
                  onClick={() => void onRestoreComment(comment.id)}
                  className="mt-4 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Restore comment
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}