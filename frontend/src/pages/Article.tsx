import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ArticleForm, type ArticleFormValues } from '@/components/ArticleForm'
import { useStore } from '@/store/store'
import { formatCategoryLabel, getInitials, toSafeImageUrl } from '@/lib/article-display'
import { translateApiError } from '@/lib/api-errors'
import {
  createComment,
  deleteArticle,
  deleteComment,
  getArticle,
  getComments,
  toggleArticleLike,
  updateArticle,
  updateComment,
  type ArticleDetail,
  type Comment,
} from '@/api/articles'

export const Article = () => {
  const { t } = useTranslation()
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

  // Comments state.
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsUnavailable, setCommentsUnavailable] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')

  // Per-comment edit state.
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false)

  // Per-comment delete state and errors, keyed by comment id.
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentActionErrors, setCommentActionErrors] = useState<Record<string, string>>({})

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
        setError(translateApiError(err, err instanceof Error ? err.message : t('article.errors.loadFailed')))
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
    if (!id || isLiking || isOwnArticle || !currentUser) {
      return
    }

    // Optimistic update.
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    setLikeCount((count) => count + (wasLiked ? -1 : 1))
    setIsLiking(true)

    try {
      const result = await toggleArticleLike(id)
      setIsLiked(result.liked)
      setLikeCount(result.likeCount)
    } catch {
      // Revert the optimistic update.
      setIsLiked(wasLiked)
      setLikeCount((count) => count + (wasLiked ? 1 : -1))
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
      setComments((prev) => [...prev, comment])
      setArticle((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev))
      setNewComment('')
    } catch (err) {
      setCommentError(translateApiError(err, err instanceof Error ? err.message : t('article.errors.postCommentFailed')))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentContent(comment.content)
    setCommentActionErrors((prev) => ({ ...prev, [comment.id]: '' }))
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentContent('')
  }

  const handleSaveEditComment = async (commentId: string) => {
    const trimmed = editingCommentContent.trim()
    if (trimmed.length === 0) {
      return
    }

    setIsSavingCommentEdit(true)

    try {
      const updated = await updateComment(commentId, trimmed)
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? updated : comment)))
      setEditingCommentId(null)
    } catch (err) {
      setCommentActionErrors((prev) => ({
        ...prev,
        [commentId]: translateApiError(err, err instanceof Error ? err.message : t('article.errors.updateCommentFailed')),
      }))
    } finally {
      setIsSavingCommentEdit(false)
    }
  }

  // Owner hard-deletes their own comment; a moderator/admin soft-removes someone else's with a reason.
  const handleDeleteComment = async (comment: Comment) => {
    const isOwnComment = currentUser?.id === comment.authorId

    let reason: string | undefined
    if (isOwnComment) {
      if (!window.confirm(t('article.deleteCommentConfirm'))) {
        return
      }
    } else {
      const promptedReason = window.prompt(t('article.removeCommentReasonPrompt'))
      if (promptedReason === null || promptedReason.trim().length === 0) {
        return
      }
      reason = promptedReason.trim()
    }

    setCommentActionErrors((prev) => ({ ...prev, [comment.id]: '' }))
    setDeletingCommentId(comment.id)

    try {
      const result = await deleteComment(comment.id, reason)
      if (isOwnComment) {
        setComments((prev) => prev.filter((item) => item.id !== comment.id))
        setArticle((prev) => (prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : prev))
      } else {
        const updated = result as Comment
        setComments((prev) => prev.map((item) => (item.id === comment.id ? updated : item)))
        setArticle((prev) => (prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : prev))
      }
    } catch (err) {
      setCommentActionErrors((prev) => ({
        ...prev,
        [comment.id]: translateApiError(err, err instanceof Error ? err.message : t('article.errors.deleteCommentFailed')),
      }))
    } finally {
      setDeletingCommentId(null)
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

    if (!window.confirm(t('article.deleteArticleConfirm'))) {
      return
    }

    setDeleteError('')
    setIsDeleting(true)

    try {
      await deleteArticle(id)
      navigate('/')
    } catch (err) {
      setDeleteError(translateApiError(err, err instanceof Error ? err.message : t('article.errors.deleteArticleFailed')))
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
          <p className="text-slate-700">{t('article.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-red-300/30 bg-red-50/40 p-8 shadow-xl backdrop-blur-md">
          <p className="text-red-700">{error ?? t('article.notFound')}</p>
          <Link to="/" className="mt-4 inline-block text-purple-700 hover:text-purple-900 font-semibold">
            {t('article.backToFeed')}
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
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {isDeleting ? t('common.deleting') : t('common.delete')}
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
              submitLabel={t('article.saveChanges')}
              isSubmitting={isSaving}
              onSubmit={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          </div>
        ) : (
          <>
            <h1 className="mt-3 break-words text-3xl font-bold text-slate-900">{article.title}</h1>

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
                disabled={isLiking || isOwnArticle || !currentUser}
                title={
                  !currentUser
                    ? t('article.loginToLikeTitle')
                    : isOwnArticle
                      ? t('article.cantLikeOwn')
                      : undefined
                }
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isLiked
                    ? 'border-purple-300 bg-purple-100 text-purple-700'
                    : 'border-slate-300 bg-white/70 text-slate-700 hover:bg-white'
                }`}
              >
                👍 {likeCount} {isLiked ? t('article.likedLabel') : t('article.likeLabel')}
              </button>
              {!currentUser && (
                <span className="text-sm text-slate-500">{t('article.loginToLikeSentence')}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Comments section */}
      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-slate-900">{t('article.comments', { count: article.commentsCount })}</h2>

        {currentUser ? (
          <form className="mt-4 space-y-2" onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              placeholder={t('article.addCommentPlaceholder')}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none"
            />
            {commentError.length > 0 && <p className="text-sm font-medium text-red-600">{commentError}</p>}
            <Button
              type="submit"
              disabled={isSubmittingComment || newComment.trim().length === 0}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {isSubmittingComment ? t('article.posting') : t('article.postComment')}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            <Link to="/login" className="font-semibold text-purple-700 hover:text-purple-900">
              {t('article.loginLink')}
            </Link>{' '}
            {t('article.loginToCommentSuffix')}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {commentsLoading ? (
            <p className="text-sm text-slate-600">{t('article.loadingComments')}</p>
          ) : commentsUnavailable ? (
            <p className="text-sm text-slate-500">{t('article.commentsUnavailable')}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-600">{t('article.noComments')}</p>
          ) : (
            comments.map((comment) => {
              const isStaff = currentUser?.role === 'MODERATOR' || currentUser?.role === 'ADMIN'
              const isOwnComment = currentUser?.id === comment.authorId
              const showRemovedPlaceholder = comment.isRemoved && !isStaff
              const commentAuthorName = comment.author.displayName ?? comment.author.username
              const commentAvatarUrl = toSafeImageUrl(comment.author.avatarUrl)
              const actionError = commentActionErrors[comment.id]

              return (
                <div key={comment.id} className="border-t border-white/30 pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-start gap-3">
                    <Link
                      to={`/profile/${comment.author.username}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-semibold text-white"
                    >
                      {commentAvatarUrl ? (
                        <img src={commentAvatarUrl} alt={commentAuthorName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getInitials(comment.author)}</span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/profile/${comment.author.username}`}
                          className="text-sm font-semibold text-slate-900 hover:text-purple-700"
                        >
                          {commentAuthorName}
                        </Link>
                        <span className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>

                        {!showRemovedPlaceholder && !isOwnComment && isStaff && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment)}
                            disabled={deletingCommentId === comment.id}
                            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deletingCommentId === comment.id ? t('article.commentRemoving') : t('article.commentRemove')}
                          </button>
                        )}

                        {!showRemovedPlaceholder && isOwnComment && editingCommentId !== comment.id && (
                          <div className="ml-auto flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(comment)}
                              className="text-xs font-semibold text-slate-600 hover:text-purple-700"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment)}
                              disabled={deletingCommentId === comment.id}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {deletingCommentId === comment.id ? t('article.commentDeleting') : t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>

                      {showRemovedPlaceholder ? (
                        <p className="mt-1 text-sm italic text-slate-400">{t('article.removedPlaceholder')}</p>
                      ) : editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => handleSaveEditComment(comment.id)}
                              disabled={isSavingCommentEdit || editingCommentContent.trim().length === 0}
                              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 text-xs font-semibold text-white shadow disabled:opacity-50"
                            >
                              {isSavingCommentEdit ? t('common.saving') : t('common.save')}
                            </Button>
                            <button
                              type="button"
                              onClick={handleCancelEditComment}
                              disabled={isSavingCommentEdit}
                              className="rounded-lg border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                            {comment.content}
                          </p>
                          {comment.isRemoved && isStaff && (
                            <p className="mt-1 text-xs italic text-red-500">
                              {comment.removedReason
                                ? t('article.removedWithReason', { reason: comment.removedReason })
                                : t('article.removedLabel')}
                            </p>
                          )}
                        </>
                      )}

                      {actionError && <p className="mt-1 text-xs font-medium text-red-600">{actionError}</p>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </article>
  )
}
