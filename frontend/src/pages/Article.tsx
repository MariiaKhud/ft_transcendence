import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { ArticleForm, type ArticleFormValues } from '@/components/ArticleForm'
import { useStore } from '@/store/store'
import { formatCategoryLabel, getInitials, toSafeImageUrl } from '@/lib/article-display'
import {
  createComment,
  deleteArticle,
  getArticle,
  getComments,
  likeArticle,
  unlikeArticle,
  updateArticle,
  type ArticleDetail,
  type Comment,
} from '@/api/articles'

export const Article = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useStore((state) => state.auth.currentUser)

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Like button state.
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [likeUnavailable, setLikeUnavailable] = useState(false)

  // Comments state.
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsUnavailable, setCommentsUnavailable] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')

  // Edit mode state.
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Delete state.
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!id) {
      return
    }

    setLoading(true)
    setError(null)

    getArticle(id)
      .then((data) => {
        setArticle(data)
        setIsLiked(data.isLikedByCurrentUser ?? false)
        setLikeCount(data.likeCount)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load article')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!id) {
      return
    }

    setCommentsLoading(true)

    getComments(id)
      .then((result) => {
        setComments(result.items)
        setCommentsUnavailable(result.isUnavailable)
      })
      .catch(() => {
        setCommentsUnavailable(true)
      })
      .finally(() => {
        setCommentsLoading(false)
      })
  }, [id])

  const isOwnArticle = Boolean(currentUser && article && currentUser.id === article.authorId)

  const handleToggleLike = async () => {
    if (!id || isLiking || likeUnavailable) {
      return
    }

    // Optimistic update.
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((count) => count + (wasLiked ? -1 : 1))
    setIsLiking(true)

    try {
      const result = wasLiked ? await unlikeArticle(id) : await likeArticle(id)
      setLikeCount(result.likeCount)
    } catch (err) {
      // Revert the optimistic update.
      setIsLiked(wasLiked)
      setLikeCount((count) => count + (wasLiked ? 1 : -1))

      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setLikeUnavailable(true)
      }
    } finally {
      setIsLiking(false)
    }
  }

  const handleSubmitComment = async (event: FormEvent) => {
    event.preventDefault()

    if (!id || newComment.trim().length === 0) {
      return
    }

    setCommentError('')
    setIsSubmittingComment(true)

    try {
      const comment = await createComment(id, newComment.trim())
      setComments((prev) => [comment, ...prev])
      setNewComment('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Unable to post comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async (values: ArticleFormValues) => {
    if (!id) {
      return
    }

    setIsSaving(true)

    try {
      const updated = await updateArticle(id, values)
      setArticle(updated)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) {
      return
    }

    if (!window.confirm('Delete this article? This cannot be undone.')) {
      return
    }

    setDeleteError('')
    setIsDeleting(true)

    try {
      await deleteArticle(id)
      navigate('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete article')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
          <p className="text-slate-700">Loading article...</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-red-300/30 bg-red-50/40 p-8 shadow-xl backdrop-blur-md">
          <p className="text-red-700">{error ?? 'Article not found'}</p>
          <Link to="/" className="mt-4 inline-block text-purple-700 hover:text-purple-900 font-semibold">
            ← Back to feed
          </Link>
        </div>
      </div>
    )
  }

  const authorName = article.author.displayName ?? article.author.username
  const avatarUrl = toSafeImageUrl(article.author.avatarUrl)

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6">
      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        {!isEditing && (
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
              {formatCategoryLabel(article.category)}
            </span>

            {isOwnArticle && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="rounded-lg border border-slate-300 bg-white/70 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        )}

        {deleteError.length > 0 && <p className="mt-2 text-sm font-medium text-red-600">{deleteError}</p>}

        {isEditing ? (
          <div className="mt-4">
            <ArticleForm
              initialValues={{ title: article.title, content: article.content, category: article.category }}
              submitLabel="Save changes"
              isSubmitting={isSaving}
              onSubmit={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{article.title}</h1>

            {/* Author info */}
            <div className="mt-4 flex items-center gap-3">
              <Link
                to={`/profile/${article.author.username}`}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={authorName} className="h-full w-full object-cover" />
                ) : (
                  <span>{getInitials(article.author)}</span>
                )}
              </Link>
              <div>
                <Link
                  to={`/profile/${article.author.username}`}
                  className="block text-sm font-semibold text-slate-900 hover:text-purple-700"
                >
                  {authorName}
                </Link>
                <span className="text-xs text-slate-500">
                  {new Date(article.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Markdown content */}
            <div className="prose prose-slate mt-6 max-w-none break-words">
              <ReactMarkdown
                components={{
                  // Shift headings down a level so they nest under the article's own <h1> title.
                  h1: 'h2',
                  h2: 'h3',
                  h3: 'h4',
                  h4: 'h5',
                  h5: 'h6',
                  h6: 'h6',
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Like button */}
            <div className="mt-6 flex items-center gap-3 border-t border-white/30 pt-4">
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={isLiking || likeUnavailable}
                title={likeUnavailable ? 'Liking is not available yet' : undefined}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isLiked
                    ? 'border-purple-300 bg-purple-100 text-purple-700'
                    : 'border-slate-300 bg-white/70 text-slate-700 hover:bg-white'
                }`}
              >
                👍 {likeCount} {isLiked ? 'Liked' : 'Like'}
              </button>
              {likeUnavailable && <span className="text-sm text-slate-500">Liking isn't available yet.</span>}
            </div>
          </>
        )}
      </div>

      {/* Comments section */}
      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-slate-900">Comments ({article.commentsCount})</h2>

        {currentUser ? (
          <form className="mt-4 space-y-2" onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              placeholder="Add a comment..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none"
            />
            {commentError.length > 0 && <p className="text-sm font-medium text-red-600">{commentError}</p>}
            <Button
              type="submit"
              disabled={isSubmittingComment || newComment.trim().length === 0}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {isSubmittingComment ? 'Posting...' : 'Post comment'}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            <Link to="/login" className="font-semibold text-purple-700 hover:text-purple-900">
              Log in
            </Link>{' '}
            to leave a comment.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {commentsLoading ? (
            <p className="text-sm text-slate-600">Loading comments...</p>
          ) : commentsUnavailable ? (
            <p className="text-sm text-slate-500">Comments aren't available yet.</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-600">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-t border-white/30 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {comment.author.displayName ?? comment.author.username}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  )
}
