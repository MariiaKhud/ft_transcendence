import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { deleteMyAvatar, updateMyProfile, uploadMyAvatar } from '@/api/users'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/store/store'

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

const MAX_DISPLAY_NAME_LENGTH = 50
const MAX_BIO_LENGTH = 500
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_MB = 2
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const EditProfile = () => {
  const { hasRestoredSession, isLoading } = useAuth({ restoreOnMount: true })

  const currentUser = useStore((state) => {
    return state.auth.currentUser
  })

  const setCurrentUser = useStore((state) => {
    return state.authActions.setCurrentUser
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDisplayName(currentUser?.displayName ?? '')
    setBio(currentUser?.bio ?? '')
  }, [currentUser])

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
      setDisplayNameError(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`)
      isValid = false
    }

    if (bio.length > MAX_BIO_LENGTH) {
      setBioError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer`)
      isValid = false
    }

    return isValid
  }

  // Map API errors to specific fields.
  const applyProfileApiError = (message: string) => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('display') || lowerMessage.includes('displayname')) {
      setDisplayNameError(message)
      return
    }

    if (lowerMessage.includes('bio')) {
      setBioError(message)
      return
    }

    setProfileFormError(message)
  }

  // Submit PATCH /api/users/me.
  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      setProfileSuccess('Profile updated successfully')
    } catch (error) {
      if (error instanceof Error) {
        applyProfileApiError(error.message)
        return
      }

      setProfileFormError('Unable to connect to the server')
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
      setAvatarError('Please choose a JPEG, PNG, or WebP image')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAvatarError(`Image must be ${MAX_FILE_SIZE_MB} MB or smaller`)
      return
    }

    // Revoke previous preview URL to free memory.
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
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

      // Clear preview since the server now has the real URL.
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(null)
      setPendingFile(null)
      setAvatarSuccess('Avatar uploaded successfully')
    } catch (error) {
      if (error instanceof Error) {
        setAvatarError(error.message)
        return
      }

      setAvatarError('Unable to connect to the server')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Cancel file selection and discard preview.
  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

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
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPendingFile(null)
    }

    try {
      const updatedUser = await deleteMyAvatar()
      setCurrentUser(updatedUser)
      setAvatarSuccess('Avatar removed successfully')
    } catch (error) {
      if (error instanceof Error) {
        setAvatarError(error.message)
        return
      }

      setAvatarError('Unable to connect to the server')
    } finally {
      setIsDeletingAvatar(false)
    }
  }

  // Redirect unauthenticated visitors.
  if (!hasRestoredSession || isLoading) {
    return (
      <section className="mx-auto w-full max-w-md space-y-8">
        <div className="rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Edit Profile</p>
          <p className="mt-3 text-slate-700">Checking your session...</p>
        </div>
      </section>
    )
  }

  if (!currentUser) {
    return (
      <section className="mx-auto w-full max-w-md space-y-8">
        <div className="rounded-2xl border border-red-200/50 bg-red-50/80 p-8 shadow-xl backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Edit Profile</p>
          <p className="mt-3 text-slate-700">You must be signed in to edit your profile.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-purple-700 hover:text-purple-900">
            Go to login →
          </Link>
        </div>
      </section>
    )
  }

  const hasCurrentAvatar = Boolean(currentUser.avatarUrl)

  return (
    <section className="mx-auto w-full max-w-md space-y-8">
      {/* Page header */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Edit Profile</h1>
        <p className="text-slate-600">Update your display name, bio, and avatar</p>
      </div>

      {/* ── Avatar block: preview, pick file, upload, remove ── */}
      <div className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-slate-900">Avatar</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white shadow-lg">
            {activeAvatarUrl ? (
              <img src={activeAvatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span>{activeInitials}</span>
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {pendingFile ? pendingFile.name : 'No file chosen'}
            </p>
            <p className="text-xs text-slate-500">JPEG, PNG or WebP · max {MAX_FILE_SIZE_MB} MB</p>
          </div>
        </div>

        {/* File picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose avatar image"
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
            Choose image
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
                {isUploadingAvatar ? 'Uploading...' : 'Upload'}
              </Button>

              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={isUploadingAvatar}
                className="rounded-lg border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : null}

          {/* Show delete button only when user has a saved avatar and no file is pending. */}
          {hasCurrentAvatar && !pendingFile ? (
            <button
              type="button"
              onClick={handleDeleteAvatar}
              disabled={isDeletingAvatar}
              className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
            >
              {isDeletingAvatar ? 'Removing...' : 'Remove avatar'}
            </button>
          ) : null}
        </div>

        {avatarError.length > 0 ? (
          <p className="rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
            {avatarError}
          </p>
        ) : null}

        {avatarSuccess.length > 0 ? (
          <p className="rounded-lg border border-green-200/50 bg-green-50/80 px-4 py-3 text-sm font-medium text-green-600">
            {avatarSuccess}
          </p>
        ) : null}
      </div>

      {/* ── Profile details block: displayName and bio ── */}
      <form
        className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 shadow-xl backdrop-blur-md"
        onSubmit={handleProfileSubmit}
        noValidate
      >
        <h2 className="text-xl font-bold text-slate-900">Profile Details</h2>

        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-semibold text-slate-900">
            Display Name
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
            placeholder="Your display name (optional)"
          />
          {displayNameError.length > 0 ? (
            <p className="text-xs font-medium text-red-500">{displayNameError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-semibold text-slate-900">
            Bio
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
            placeholder="Tell people a little about yourself (optional)"
          />
          <p className="text-right text-xs text-slate-400">
            {bio.length} / {MAX_BIO_LENGTH}
          </p>
          {bioError.length > 0 ? <p className="text-xs font-medium text-red-500">{bioError}</p> : null}
        </div>

        {profileFormError.length > 0 ? (
          <p className="rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
            {profileFormError}
          </p>
        ) : null}

        {profileSuccess.length > 0 ? (
          <p className="rounded-lg border border-green-200/50 bg-green-50/80 px-4 py-3 text-sm font-medium text-green-600">
            {profileSuccess}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmittingProfile}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
        >
          {isSubmittingProfile ? 'Saving...' : 'Save Changes'}
        </Button>

        <p className="text-center text-sm text-slate-600">
          <Link
            to={`/profile/${currentUser.username}`}
            className="font-semibold text-purple-700 hover:text-purple-900"
          >
            ← Back to your profile
          </Link>
        </p>
      </form>
    </section>
  )
}
