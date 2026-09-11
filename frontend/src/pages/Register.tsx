import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { StatusMessage } from '@/components/ui/status-message'
import { registerUser } from '@/api/auth'
import { getApiErrorCode, translateApiError } from '@/lib/api-errors'

interface TranslatedError {
  key?: string
  fallback?: string
}

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateUsername = (username: string) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  return usernameRegex.test(username)
}

export const Register = () => {
  const { t, i18n } = useTranslation()
  // Move user to login page after success.
  const navigate = useNavigate()

  // Form values and errors.
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState<TranslatedError | null>(null)
  const [usernameError, setUsernameError] = useState<TranslatedError | null>(null)
  const [passwordError, setPasswordError] = useState<TranslatedError | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<TranslatedError | null>(null)
  const [formError, setFormError] = useState<TranslatedError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const getErrorText = (error: TranslatedError | null) => {
    if (!error) {
      return ''
    }

    if (error.key && i18n.exists(error.key)) {
      return t(error.key)
    }

    return error.fallback ?? ''
  }

  // Clear old errors.
  const clearErrors = () => {
    setEmailError(null)
    setUsernameError(null)
    setPasswordError(null)
    setConfirmPasswordError(null)
    setFormError(null)
  }

  // Check fields before submit.
  const validateFields = () => {
    let isValid = true
    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    if (trimmedEmail.length === 0) {
      setEmailError({ key: 'auth.errors.emailRequired' })
      isValid = false
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError({ key: 'auth.errors.emailInvalid' })
      isValid = false
    }

    if (trimmedUsername.length === 0) {
      setUsernameError({ key: 'register.errors.usernameRequired' })
      isValid = false
    } else if (!validateUsername(trimmedUsername)) {
      setUsernameError({ key: 'register.errors.usernameInvalid' })
      isValid = false
    }

    if (password.length === 0) {
      setPasswordError({ key: 'auth.errors.passwordRequired' })
      isValid = false
    } else if (password.length < 8 || password.length > 72) {
      setPasswordError({ key: 'register.errors.passwordLength' })
      isValid = false
    } else if (/\s/.test(password)) {
      setPasswordError({ key: 'register.errors.passwordWhitespace' })
      isValid = false
    }

    if (confirmPassword.length === 0) {
      setConfirmPasswordError({ key: 'register.errors.confirmRequired' })
      isValid = false
    } else if (confirmPassword !== password) {
      setConfirmPasswordError({ key: 'register.errors.passwordMismatch' })
      isValid = false
    }

    return isValid
  }

  // Show API error in the right field.
  const applyApiError = (message: string, error?: unknown) => {
    const code = getApiErrorCode(error)

    if (code && i18n.exists(`api.errors.${code}`)) {
      const translatedKey = `api.errors.${code}`

      if (code.toLowerCase().includes('email')) {
        setEmailError({ key: translatedKey })
        return
      }

      if (code.toLowerCase().includes('username')) {
        setUsernameError({ key: translatedKey })
        return
      }

      if (code.toLowerCase().includes('password')) {
        setPasswordError({ key: translatedKey })
        return
      }

      setFormError({ key: translatedKey })
      return
    }

    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('email')) {
      setEmailError({ fallback: message })
      return
    }

    if (lowerMessage.includes('username')) {
      setUsernameError({ fallback: message })
      return
    }

    if (lowerMessage.includes('password')) {
      setPasswordError({ fallback: message })
      return
    }

    setFormError({ fallback: message })
  }

  // Send register request.
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    // Stop normal HTML form submit.
    event.preventDefault()
    // Remove old errors first.
    clearErrors()

    // Stop if form is not valid.
    if (!validateFields()) {
      return
    }

    // Try register and handle errors.
    try {
      const normalizedEmail = email.trim()
      const normalizedUsername = username.trim().toLowerCase()

      setIsSubmitting(true)
      await registerUser({
        email: normalizedEmail,
        username: normalizedUsername,
        password,
      })

    // Go to login page after success.
      navigate('/login', { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        applyApiError(translateApiError(error, error.message), error)
        return
      }

      setFormError({ key: 'common.unableToConnect' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-md space-y-8">
      {/* Register header */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t('register.title')}</h1>
        <p className="text-slate-600">{t('register.subtitle')}</p>
      </div>

      {/* Register form */}
      <form
        className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
            {t('auth.emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder={t('auth.emailPlaceholder')}
          />
          <p className="text-xs text-slate-500">{t('auth.emailHint')}</p>
          {emailError ? <p className="text-xs font-medium text-pink-600">{getErrorText(emailError)}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-semibold text-slate-900">
            {t('register.usernameLabel')}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
            }}
            maxLength={20}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder={t('register.usernamePlaceholder')}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{t('register.usernameHint')}</p>
            <p className="text-xs text-slate-400">{t('common.counter', { count: username.length, max: 20 })}</p>
          </div>
          {usernameError ? <p className="text-xs font-medium text-pink-600">{getErrorText(usernameError)}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
            {t('auth.passwordLabel')}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
              }}
              className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 pr-20 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
              placeholder={t('auth.passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword(!showPassword)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-700 hover:text-purple-900"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                  <path d="M9.88 5.09A10.94 10.94 0 0112 5c5.5 0 9 7 9 7a17.24 17.24 0 01-2.21 3.15" />
                  <path d="M6.61 6.61C4.37 8.04 3 10 3 10s3.5 7 9 7a9.9 9.9 0 004.39-.94" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{t('auth.passwordHelp')}</p>
            <p className="text-xs text-slate-400">{t('common.counter', { count: password.length, max: 72 })}</p>
          </div>
          {passwordError ? <p className="text-xs font-medium text-pink-600">{getErrorText(passwordError)}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-900">
            {t('register.confirmPasswordLabel')}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
              }}
              className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 pr-20 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
              placeholder={t('register.confirmPasswordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => {
                setShowConfirmPassword(!showConfirmPassword)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-700 hover:text-purple-900"
              aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showConfirmPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                  <path d="M9.88 5.09A10.94 10.94 0 0112 5c5.5 0 9 7 9 7a17.24 17.24 0 01-2.21 3.15" />
                  <path d="M6.61 6.61C4.37 8.04 3 10 3 10s3.5 7 9 7a9.9 9.9 0 004.39-.94" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-right text-xs text-slate-400">{t('common.counter', { count: confirmPassword.length, max: 72 })}</p>
          {confirmPasswordError ? (
            <p className="text-xs font-medium text-pink-600">{getErrorText(confirmPasswordError)}</p>
          ) : null}
        </div>

        {formError ? (
          <StatusMessage tone="error">
            {getErrorText(formError)}
          </StatusMessage>
        ) : null}

        <Button
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('register.creatingAccount') : t('register.createAccount')}
        </Button>

        <p className="text-center text-sm text-slate-600">
          {t('register.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-purple-700 hover:text-purple-900">
            {t('register.signInLink')}
          </Link>
        </p>
      </form>
    </section>
  )
}
