import { useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { GlassPanel } from '@/components/ui/glass-panel'
import { PageEyebrow } from '@/components/ui/page-eyebrow'
import { StatusMessage } from '@/components/ui/status-message'
import { deleteMyAccount } from '@/api/auth'
import { deleteMyAvatar, deleteMyCv, updateMyProfile, uploadMyAvatar, uploadMyCv } from '@/api/users'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/store/store'
import { getApiErrorCode, translateApiError } from '@/lib/api-errors'

// Convert relative avatar path to full URL for browser image tag.
const toSafeImageUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) {
    return null
  }

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
    return avatarUrl
  }

  return `${window.location.origin}${avatarUrl}`
}

// Create initials when user has no avatar image.
const getInitials = (displayName: string | null, username: string) => {
  const source = (displayName ?? username).trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return 'U'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

const MAX_DISPLAY_NAME_LENGTH = 20
const MAX_BIO_LENGTH = 500
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_MB = 2
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const CV_MAX_FILE_SIZE_MB = 5
const CV_MAX_FILE_SIZE_BYTES = CV_MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_CV_MIME_TYPES = new Set([
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const DISPLAY_NAME_ERROR_CODES = new Set([
  'validation_display_name_max_length',
  'validation_display_name_invalid',
])
const BIO_ERROR_CODES = new Set([
  'validation_bio_max_length',
  'validation_bio_invalid',
])

export const EditProfile = () => {
  const { t } = useTranslation()
  const { hasRestoredSession, isLoading } = useAuth({ restoreOnMount: true })
  const navigate = useNavigate()

  const currentUser = useStore((state) => {
    return state.auth.currentUser
  })

  const setCurrentUser = useStore((state) => {
    return state.authActions.setCurrentUser
  })

  const clearCurrentUser = useStore((state) => {
    return state.authActions.clearCurrentUser
  })

  // Profile fields.
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '')
  const [bio, setBio] = useState(currentUser?.bio ?? '')

  // Field-level errors for profile form.
  const [displayNameError, setDisplayNameError] = useState('')
  const [bioError, setBioError] = useState('')
  const [profileFormError, setProfileFormError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)

  // Avatar state.
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false)
  const [pendingCv, setPendingCv] = useState<File | null>(null)
  const [cvError, setCvError] = useState('')
  const [cvSuccess, setCvSuccess] = useState('')
  const [isUploadingCv, setIsUploadingCv] = useState(false)
  const [isDeletingCv, setIsDeletingCv] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [accountDeleteError, setAccountDeleteError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplayName(currentUser?.displayName ?? '')
    setBio(currentUser?.bio ?? '')
  }, [currentUser])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Current avatar URL from store, or the preview of the pending file.
  const activeAvatarUrl = previewUrl ?? toSafeImageUrl(currentUser?.avatarUrl ?? null)
  const activeInitials = getInitials(currentUser?.displayName ?? null, currentUser?.username ?? '')

  // Clear profile form errors.
  const clearProfileErrors = () => {
    setDisplayNameError('')
    setBioError('')
    setProfileFormError('')
    setProfileSuccess('')
  }

  // Validate profile fields before submitting.
  const validateProfileFields = (): boolean => {
    let isValid = true
    const trimmedDisplayName = displayName.trim()

    if (trimmedDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
      setDisplayNameError(t('editProfile.errors.displayNameMaxLength', { max: MAX_DISPLAY_NAME_LENGTH }))
      isValid = false
    }

    if (bio.trim().length > MAX_BIO_LENGTH) {
      setBioError(t('editProfile.errors.bioMaxLength', { max: MAX_BIO_LENGTH }))
      isValid = false
    }

    return isValid
  }

  // Map API errors to specific fields.
  const applyProfileApiError = (error: unknown) => {
    const code = getApiErrorCode(error)
    const message = translateApiError(error, t('common.unableToConnect'))

    if (code && DISPLAY_NAME_ERROR_CODES.has(code)) {
      setDisplayNameError(message)
      return
    }

    if (code && BIO_ERROR_CODES.has(code)) {
      setBioError(message)
      return
    }

    setProfileFormError(message)
  }

  // Submit PATCH /api/users/me.
  const handleProfileSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearProfileErrors()

    if (!validateProfileFields()) {
      return
    }

    setIsSubmittingProfile(true)

    try {
      const trimmedDisplayName = displayName.trim()

      const updatedUser = await updateMyProfile({
        displayName: trimmedDisplayName.length > 0 ? trimmedDisplayName : null,
        bio: bio.trim().length > 0 ? bio.trim() : null,
      })

      setCurrentUser(updatedUser)
      setProfileSuccess(t('editProfile.success.profileUpdated'))
    } catch (error) {
      applyProfileApiError(error)
    } finally {
      setIsSubmittingProfile(false)
    }
  }

  // Pick a file from disk and show a local preview.
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarError('')
    setAvatarSuccess('')

    const file = event.target.files?.[0]

    // Reset so same file can be selected again.
    event.target.value = ''

    if (!file) {
      return
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setPendingFile(null)
      setPreviewUrl(null)
      setAvatarError(t('editProfile.errors.invalidImageType'))
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPendingFile(null)
      setPreviewUrl(null)
      setAvatarError(t('editProfile.errors.imageTooLarge', { maxMb: MAX_FILE_SIZE_MB }))
      return
    }

    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // POST /api/users/me/avatar with the selected file.
  const handleUploadAvatar = async () => {
    if (!pendingFile) {
      return
    }

    setAvatarError('')
    setAvatarSuccess('')
    setIsUploadingAvatar(true)

    try {
      const updatedUser = await uploadMyAvatar(pendingFile)
      setCurrentUser(updatedUser)

      setPreviewUrl(null)
      setPendingFile(null)
      setAvatarSuccess(t('editProfile.success.avatarUploaded'))
    } catch (error) {
      if (error instanceof Error) {
        setAvatarError(translateApiError(error, error.message))
        return
      }

      setAvatarError(t('common.unableToConnect'))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Cancel file selection and discard preview.
  const handleCancelPreview = () => {
    setPreviewUrl(null)
    setPendingFile(null)
    setAvatarError('')
  }

  // DELETE /api/users/me/avatar to remove the avatar.
  const handleDeleteAvatar = async () => {
    setAvatarError('')
    setAvatarSuccess('')
    setIsDeletingAvatar(true)

    // Also discard any pending preview.
    if (previewUrl || pendingFile) {
      setPreviewUrl(null)
      setPendingFile(null)
    }

    try {
      const updatedUser = await deleteMyAvatar()
      setCurrentUser(updatedUser)
      setAvatarSuccess(t('editProfile.success.avatarRemoved'))
    } catch (error) {
      if (error instanceof Error) {
        setAvatarError(translateApiError(error, error.message))
        return
      }

      setAvatarError(t('common.unableToConnect'))
    } finally {
      setIsDeletingAvatar(false)
    }
  }

  const handleCvChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCvError('')
    setCvSuccess('')
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!ALLOWED_CV_MIME_TYPES.has(file.type)) {
      setPendingCv(null)
      setCvError(t('editProfile.errors.invalidCvType'))
      return
    }

    if (file.size > CV_MAX_FILE_SIZE_BYTES) {
      setPendingCv(null)
      setCvError(t('editProfile.errors.cvTooLarge', { maxMb: CV_MAX_FILE_SIZE_MB }))
      return
    }

    setPendingCv(file)
  }

  const handleUploadCv = async () => {
    if (!pendingCv) return

    setCvError('')
    setCvSuccess('')
    setIsUploadingCv(true)

    try {
      setCurrentUser(await uploadMyCv(pendingCv))
      setPendingCv(null)
      setCvSuccess(t('editProfile.success.cvUploaded'))
    } catch (error) {
      setCvError(error instanceof Error ? translateApiError(error, error.message) : t('common.unableToConnect'))
    } finally {
      setIsUploadingCv(false)
    }
  }

  const handleDeleteCv = async () => {
    setCvError('')
    setCvSuccess('')
    setIsDeletingCv(true)

    try {
      setCurrentUser(await deleteMyCv())
      setPendingCv(null)
      setCvSuccess(t('editProfile.success.cvRemoved'))
    } catch (error) {
      setCvError(error instanceof Error ? translateApiError(error, error.message) : t('common.unableToConnect'))
    } finally {
      setIsDeletingCv(false)
    }
  }

  // Require explicit confirmation before permanently deleting the account.
  const handleDeleteAccount = async () => {
    if (!window.confirm(t('editProfile.deleteAccountConfirm'))) {
      return
    }

    setAccountDeleteError('')
    setIsDeletingAccount(true)

    try {
      await deleteMyAccount()
      clearCurrentUser()
      sessionStorage.setItem('accountDeleted', '1')
      navigate('/login', { replace: true })
    } catch (error) {
      setAccountDeleteError(error instanceof Error ? translateApiError(error, error.message) : t('common.unableToConnect'))
      setIsDeletingAccount(false)
    }
  }

  // Redirect unauthenticated visitors.
  if (!hasRestoredSession || isLoading) {
    return (
      <section className="mx-auto w-full max-w-md space-y-8">
        <GlassPanel>
          <PageEyebrow>{t('editProfile.title')}</PageEyebrow>
          <p className="mt-3 text-slate-700">{t('common.checkingSession')}</p>
        </GlassPanel>
      </section>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const hasCurrentAvatar = Boolean(currentUser.avatarUrl)

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      {/* Page header */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t('editProfile.title')}</h1>
        <p className="text-slate-600">{t('editProfile.subtitle')}</p>
      </div>

      {/* ── Avatar block: preview, pick file, upload, remove ── */}
      <GlassPanel className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">{t('editProfile.avatarHeading')}</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white shadow-lg">
            {activeAvatarUrl ? (
              <img src={activeAvatarUrl} alt={t('editProfile.avatarPreviewAlt')} className="h-full w-full object-cover" />
            ) : (
              <span>{activeInitials}</span>
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {pendingFile ? pendingFile.name : t('editProfile.noFileChosen')}
            </p>
            <p className="text-xs text-slate-500">{t('editProfile.fileHint', { maxMb: MAX_FILE_SIZE_MB })}</p>
          </div>
        </div>

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={t('editProfile.chooseAvatarAria')}
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click()
            }}
            className="rounded-lg border border-purple-200 bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 transition-all hover:border-purple-300 hover:bg-white disabled:opacity-50"
            disabled={isUploadingAvatar || isDeletingAvatar}
          >
            {t('editProfile.chooseImage')}
          </button>

          {/* Show upload button only when a file is pending. */}
          {pendingFile ? (
            <>
              <Button
                type="button"
                onClick={handleUploadAvatar}
                disabled={isUploadingAvatar}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {isUploadingAvatar ? t('editProfile.uploading') : t('editProfile.upload')}
              </Button>

              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={isUploadingAvatar}
                className="rounded-lg border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-white disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : null}

          {/* Show delete button only when user has a saved avatar and no file is pending. */}
          {hasCurrentAvatar && !pendingFile ? (
            <Button
              type="button"
              onClick={handleDeleteAvatar}
              disabled={isDeletingAvatar}
              variant="destructiveSoft"
            >
              {isDeletingAvatar ? t('editProfile.removing') : t('editProfile.removeAvatar')}
            </Button>
          ) : null}
        </div>

        {avatarError.length > 0 ? (
          <StatusMessage tone="error">
            {avatarError}
          </StatusMessage>
        ) : null}

        {avatarSuccess.length > 0 ? (
          <StatusMessage tone="success">
            {avatarSuccess}
          </StatusMessage>
        ) : null}
      </GlassPanel>

      <GlassPanel className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">{t('editProfile.cvHeading')}</h2>

        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {pendingCv?.name ?? currentUser.cvFilename ?? t('editProfile.noCvChosen')}
          </p>
          <p className="text-xs text-slate-500">{t('editProfile.cvHint', { maxMb: CV_MAX_FILE_SIZE_MB })}</p>
        </div>

        <input
          ref={cvInputRef}
          type="file"
          accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label={t('editProfile.chooseCv')}
          onChange={handleCvChange}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => cvInputRef.current?.click()}
            disabled={isUploadingCv || isDeletingCv}
            className="rounded-lg border border-purple-200 bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 transition-all hover:border-purple-300 hover:bg-white disabled:opacity-50"
          >
            {t('editProfile.chooseCv')}
          </button>

          {pendingCv ? (
            <>
              <Button
                type="button"
                onClick={handleUploadCv}
                disabled={isUploadingCv}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
              >
                {isUploadingCv ? t('editProfile.uploading') : t('editProfile.uploadCv')}
              </Button>
              <button
                type="button"
                onClick={() => setPendingCv(null)}
                disabled={isUploadingCv}
                className="rounded-lg border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-white disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : null}

          {currentUser.cvUrl && !pendingCv ? (
            <button
              type="button"
              onClick={handleDeleteCv}
              disabled={isDeletingCv}
              className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
            >
              {isDeletingCv ? t('editProfile.removing') : t('editProfile.removeCv')}
            </button>
          ) : null}
        </div>
        {cvError.length > 0 ? <StatusMessage tone="error">{cvError}</StatusMessage> : null}
        {cvSuccess.length > 0 ? <StatusMessage tone="success">{cvSuccess}</StatusMessage> : null}
      </GlassPanel>

      {/* ── Profile details block: displayName and bio ── */}
      <form
        className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md"
        onSubmit={handleProfileSubmit}
        noValidate
      >
        <h2 className="text-xl font-bold text-slate-900">{t('editProfile.detailsHeading')}</h2>

        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-semibold text-slate-900">
            {t('editProfile.displayNameLabel')}
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value)
            }}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder={t('editProfile.displayNamePlaceholder')}
          />
          <p className="text-right text-xs text-slate-400">
            {t('common.counter', { count: displayName.length, max: MAX_DISPLAY_NAME_LENGTH })}
          </p>
          {displayNameError.length > 0 ? (
            <p className="text-xs font-medium text-pink-600">{displayNameError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-semibold text-slate-900">
            {t('editProfile.bioLabel')}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={bio}
            onChange={(event) => {
              setBio(event.target.value)
            }}
            maxLength={MAX_BIO_LENGTH}
            className="w-full resize-none rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder={t('editProfile.bioPlaceholder')}
          />
          <p className="text-right text-xs text-slate-400">
            {t('common.counter', { count: bio.length, max: MAX_BIO_LENGTH })}
          </p>
          {bioError.length > 0 ? <p className="text-xs font-medium text-pink-600">{bioError}</p> : null}
        </div>

        {profileFormError.length > 0 ? (
          <StatusMessage tone="error">
            {profileFormError}
          </StatusMessage>
        ) : null}

        {profileSuccess.length > 0 ? (
          <StatusMessage tone="success">
            {profileSuccess}
          </StatusMessage>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmittingProfile}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
        >
          {isSubmittingProfile ? t('common.saving') : t('editProfile.saveChanges')}
        </Button>

        <p className="text-center text-sm text-slate-600">
          <Link
            to={`/profile/${currentUser.username}`}
            className="font-semibold text-purple-700 hover:text-purple-900"
          >
            {t('editProfile.backToProfile')}
          </Link>
        </p>
      </form>

      <section className="space-y-4 rounded-2xl border border-red-200/70 bg-red-50/60 p-8 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-red-800">{t('editProfile.dangerZoneHeading')}</h2>
          <p className="mt-2 text-sm text-red-700">{t('editProfile.deleteAccountDescription')}</p>
        </div>

        {accountDeleteError.length > 0 ? (
          <p className="rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
            {accountDeleteError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            void handleDeleteAccount()
          }}
          disabled={isDeletingAccount}
          className="rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
        >
          {isDeletingAccount ? t('editProfile.deletingAccount') : t('editProfile.deleteAccount')}
        </button>
      </section>
    </section>
  )
}
