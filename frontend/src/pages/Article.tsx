import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PencilIcon, Spinner, TrashIcon } from '@/components/ui/icons'
import { ArticleForm, type ArticleFormValues } from '@/components/ArticleForm'
import { useStore } from '@/store/store'
import { getSocket } from '@/lib/socket'
import { formatCategoryLabel, getInitials, toSafeImageUrl } from '@/lib/article-display'
import { useTopRanks } from '@/hooks/useTopRanks'
import { getRankFrameClass } from '@/lib/rank-frame'
import { getApiErrorCode, translateApiError } from '@/lib/api-errors'
import { getCurrentUser } from '@/api/auth'
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

const COMMENT_MAX_LENGTH = 1000
const REMOVE_REASON_MAX_LENGTH = 500

// A per-comment action error is either a stable backend error code (re-resolved
// on every render so it follows language switches) or an already-resolved
// message string, used when there's no matching code (e.g. a network failure).
type ActionError = { code: string } | string

export const Article = () => {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useStore((state) => state.auth.currentUser)
  const setCurrentUser = useStore((state) => state.authActions.setCurrentUser)
  const topRanks = useTopRanks()

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ActionError | null>(null)

  // Like button state.
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)

  // Comments state.
  const [comments, setComments] = useState<Comment[]>([])
  // Mirrors which comment ids are currently in state, kept in sync at every mutation
  // site so live socket events can tell a genuinely new change from an echo of the
  // current user's own action (e.g. their own comment/delete coming back over the socket).
  const commentIdsRef = useRef<Set<string>>(new Set())
  const [commentsUnavailable, setCommentsUnavailable] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState<ActionError>('')

  // Per-comment edit state.
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')
  const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false)

  // Per-comment delete state and errors, keyed by comment id.
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentActionErrors, setCommentActionErrors] = useState<Record<string, ActionError>>({})

  // Resolve an ActionError for display: a backend code is re-translated on every
  // render (so it follows language switches); a plain string is shown as-is.
  const resolveActionError = (error: ActionError | null | undefined): string => {
    if (!error) return ''
    return typeof error === 'string' ? error : t(`api.errors.${error.code}`)
  }

  // Route a caught API error into an ActionError: a known backend code is stored
  // as-is (translated lazily at render time); anything else falls back to the
  // already-resolved message text.
  const toActionError = (err: unknown, fallbackMessage: string): ActionError => {
    const code = getApiErrorCode(err)
    return code && i18n.exists(`api.errors.${code}`) ? { code } : translateApiError(err, fallbackMessage)
  }

  // Edit mode state.
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Delete state.
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<ActionError>('')

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
        setError(toActionError(err, err instanceof Error ? err.message : t('article.errors.loadFailed')))
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
        commentIdsRef.current = new Set(result.items.map((comment) => comment.id))
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

  // Join the article's room so comments posted, edited, or removed by other users
  // while this page is open appear live, without needing a manual refresh.
  useEffect(() => {
    if (!id) {
      return
    }

    const socket = getSocket()
    socket.emit('article:join', id)

    const onNewComment = (comment: Comment) => {
      if (commentIdsRef.current.has(comment.id)) {
        return
      }
      commentIdsRef.current.add(comment.id)
      setComments((prev) => [...prev, comment])
      setArticle((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev))
    }

    const onCommentUpdated = (comment: Comment) => {
      setComments((prev) => prev.map((item) => (item.id === comment.id ? comment : item)))
    }

    const onCommentDeleted = ({ id: commentId }: { id: string }) => {
      if (!commentIdsRef.current.has(commentId)) {
        return
      }
      commentIdsRef.current.delete(commentId)
      setComments((prev) => prev.filter((item) => item.id !== commentId))
      setArticle((prev) => (prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : prev))
    }

    const onLikeUpdated = ({ likeCount: count }: { likeCount: number }) => {
      setLikeCount(count)
    }

    socket.on('comment:new', onNewComment)
    socket.on('comment:updated', onCommentUpdated)
    socket.on('comment:deleted', onCommentDeleted)
    socket.on('article:like-updated', onLikeUpdated)

    return () => {
      socket.emit('article:leave', id)
      socket.off('comment:new', onNewComment)
      socket.off('comment:updated', onCommentUpdated)
      socket.off('comment:deleted', onCommentDeleted)
      socket.off('article:like-updated', onLikeUpdated)
    }
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

  const handleSubmitComment = async (event: SubmitEvent) => {
    event.preventDefault()

    const trimmedComment = newComment.trim()
    if (!id || trimmedComment.length === 0) {
      return
    }

    if (trimmedComment.length > COMMENT_MAX_LENGTH) {
      setCommentError(t('article.errors.commentTooLong', { max: COMMENT_MAX_LENGTH }))
      return
    }

    setCommentError('')
    setIsSubmittingComment(true)

    try {
      const comment = await createComment(id, trimmedComment)
      // The server pushes this comment over the socket before the HTTP response
      // arrives, so it may already be in state (added by the socket listener) by
      // the time we get here — guard against adding it twice.
      if (!commentIdsRef.current.has(comment.id)) {
        commentIdsRef.current.add(comment.id)
        setComments((prev) => [...prev, comment])
        setArticle((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev))
      }
      setNewComment('')
    } catch (err) {
      setCommentError(toActionError(err, err instanceof Error ? err.message : t('article.errors.postCommentFailed')))
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

    if (trimmed.length > COMMENT_MAX_LENGTH) {
      setCommentActionErrors((prev) => ({
        ...prev,
        [commentId]: t('article.errors.commentTooLong', { max: COMMENT_MAX_LENGTH }),
      }))
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
        [commentId]: toActionError(err, err instanceof Error ? err.message : t('article.errors.updateCommentFailed')),
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
      const trimmedReason = promptedReason.trim()
      if (trimmedReason.length > REMOVE_REASON_MAX_LENGTH) {
        setCommentActionErrors((prev) => ({
          ...prev,
          [comment.id]: t('article.errors.removeReasonTooLong', { max: REMOVE_REASON_MAX_LENGTH }),
        }))
        return
      }

      // Moderator/admin status can be revoked by an admin after this page loaded,
      // leaving a stale "Remove" button visible. Re-check against the server before
      // attempting the delete, so a since-demoted user gets the same "not allowed"
      // message without an avoidable 403 hitting the console.
      try {
        const freshUser = await getCurrentUser()
        setCurrentUser(freshUser)
        if (freshUser.role !== 'MODERATOR' && freshUser.role !== 'ADMIN') {
          setCommentActionErrors((prev) => ({ ...prev, [comment.id]: { code: 'comment_delete_forbidden' } }))
          return
        }
      } catch {
        // Freshness check itself failed (e.g. session expired) — fall through and
        // let the real delete request surface whatever the actual error is.
      }

      reason = trimmedReason
    }

    setCommentActionErrors((prev) => ({ ...prev, [comment.id]: '' }))
    setDeletingCommentId(comment.id)

    try {
      const result = await deleteComment(comment.id, reason)
      if (isOwnComment) {
        // Symmetric with the add guard above — the socket event may have already removed it.
        if (commentIdsRef.current.has(comment.id)) {
          commentIdsRef.current.delete(comment.id)
          setComments((prev) => prev.filter((item) => item.id !== comment.id))
          setArticle((prev) => (prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : prev))
        }
      } else {
        const updated = result as Comment
        setComments((prev) => prev.map((item) => (item.id === comment.id ? updated : item)))
        setArticle((prev) => (prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : prev))
      }
    } catch (err) {
      setCommentActionErrors((prev) => ({
        ...prev,
        [comment.id]: toActionError(err, err instanceof Error ? err.message : t('article.errors.deleteCommentFailed')),
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
      setDeleteError(toActionError(err, err instanceof Error ? err.message : t('article.errors.deleteArticleFailed')))
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md text-center">
          <p className="text-slate-700">{t('article.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-red-300/30 bg-red-50/40 p-8 shadow-xl backdrop-blur-md">
          <p className="text-red-700">{error ? resolveActionError(error) : t('article.notFound')}</p>
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
    <article className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        {!isEditing && (
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
              {formatCategoryLabel(article.category)}
            </span>

            {isOwnArticle && (
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="profile" onClick={handleStartEdit}>
                  <PencilIcon />
                  {t('common.edit')}
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Spinner /> : <TrashIcon />}
                  {isDeleting ? t('common.deleting') : t('common.delete')}
                </Button>
              </div>
            )}
          </div>
        )}

        {deleteError && <p className="mt-2 text-sm font-medium text-red-600">{resolveActionError(deleteError)}</p>}

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
                className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white ${getRankFrameClass(topRanks.get(article.author.id))}`}
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
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder={t('article.addCommentPlaceholder')}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none"
            />
            <p className={`text-right text-xs ${newComment.length > COMMENT_MAX_LENGTH * 0.9 ? 'text-pink-500' : 'text-slate-400'}`}>
              {t('common.counter', { count: newComment.length, max: COMMENT_MAX_LENGTH })}
            </p>
            {commentError && <p className="text-sm font-medium text-red-600">{resolveActionError(commentError)}</p>}
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

                        {!comment.isRemoved && !isOwnComment && isStaff && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="notification"
                            className="ml-auto"
                            onClick={() => handleDeleteComment(comment)}
                            disabled={deletingCommentId === comment.id}
                          >
                            {deletingCommentId === comment.id ? <Spinner /> : <TrashIcon />}
                            {deletingCommentId === comment.id ? t('article.commentRemoving') : t('article.commentRemove')}
                          </Button>
                        )}

                        {!showRemovedPlaceholder && isOwnComment && editingCommentId !== comment.id && (
                          <div className="ml-auto flex gap-2">
                            <Button
                              type="button"
                              variant="profile"
                              size="notification"
                              onClick={() => handleStartEditComment(comment)}
                            >
                              <PencilIcon />
                              {t('common.edit')}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="notification"
                              onClick={() => handleDeleteComment(comment)}
                              disabled={deletingCommentId === comment.id}
                            >
                              {deletingCommentId === comment.id ? <Spinner /> : <TrashIcon />}
                              {deletingCommentId === comment.id ? t('article.commentDeleting') : t('common.delete')}
                            </Button>
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
                            maxLength={COMMENT_MAX_LENGTH}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none"
                          />
                          <p className={`text-right text-xs ${editingCommentContent.length > COMMENT_MAX_LENGTH * 0.9 ? 'text-pink-500' : 'text-slate-400'}`}>
                            {t('common.counter', { count: editingCommentContent.length, max: COMMENT_MAX_LENGTH })}
                          </p>
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
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs italic text-pink-600">
                              {comment.removedReason
                                ? t('article.removedWithReason', { reason: comment.removedReason })
                                : t('article.removedLabel')}
                            </p>
                          )}
                        </>
                      )}

                      {actionError && <p className="mt-1 text-xs font-medium text-red-600">{resolveActionError(actionError)}</p>}
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
