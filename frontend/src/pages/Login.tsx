import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { translateApiError } from '@/lib/api-errors'

const OAUTH_PROVIDERS = [
  { key: 'google', label: 'Google' },
  { key: 'github', label: 'GitHub' },
  { key: '42', label: '42' },
] as const

type OAuthProviderKey = (typeof OAUTH_PROVIDERS)[number]['key']

type OAuthProvidersResponse = {
  success: boolean
  data?: string[]
}

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const OAUTH_ERROR_CODES = new Set([
  'oauth_provider_denied',
  'oauth_state_missing',
  'oauth_state_invalid',
  'oauth_email_missing',
  'oauth_profile_invalid',
  'oauth_account_conflict',
  'oauth_callback_invalid',
  'oauth_access_token_failed',
  'oauth_redirect_uri_mismatch',
  'oauth_user_not_found',
  'oauth_provider_unavailable',
])

const getOAuthErrorMessage = (t: TFunction, code: string) => {
  if (!OAUTH_ERROR_CODES.has(code)) {
    return ''
  }

  return t(`login.oauthErrors.${code}`)
}

const getOAuthProviderIcon = (provider: OAuthProviderKey): ReactNode => {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M21.35 11.1H12v2.98h5.35a4.58 4.58 0 01-1.98 3.01v2.5h3.21c1.87-1.72 2.95-4.25 2.95-7.2 0-.45-.05-.88-.13-1.3z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.67 0 4.92-.88 6.56-2.41l-3.21-2.5c-.89.6-2.03.96-3.35.96-2.57 0-4.75-1.73-5.53-4.07H3.15v2.56A9.99 9.99 0 0012 22z"
          fill="#34A853"
        />
        <path
          d="M6.47 13.98A6 6 0 016.17 12c0-.68.12-1.34.3-1.98V7.46H3.15A9.99 9.99 0 002 12c0 1.61.38 3.13 1.15 4.54l3.32-2.56z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.95c1.46 0 2.77.5 3.8 1.47l2.84-2.84C16.91 2.98 14.66 2 12 2A9.99 9.99 0 003.15 7.46l3.32 2.56c.78-2.34 2.96-4.07 5.53-4.07z"
          fill="#EA4335"
        />
      </svg>
    )
  }

  if (provider === 'github') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.21.68-.48v-1.68c-2.77.6-3.35-1.19-3.35-1.19-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.54 1.03 1.54 1.03.89 1.52 2.34 1.08 2.91.82.09-.64.35-1.08.63-1.33-2.21-.25-4.53-1.11-4.53-4.93 0-1.09.39-1.98 1.03-2.68-.11-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.53 9.53 0 0112 6.8c.85 0 1.7.11 2.5.33 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.21 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.83-2.32 4.67-4.54 4.92.36.31.68.91.68 1.84v2.82c0 .27.18.57.69.48A10 10 0 0012 2z" />
      </svg>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-current text-xs font-extrabold leading-none"
    >
      42
    </span>
  )
}

export const Login = () => {
  // throw new Error('TEMP_TEST_ERROR')  // Comment this out to test 500 error page
  const { t } = useTranslation()
  // Move user to another page after login.
  const navigate = useNavigate()
  const location = useLocation()

  const { login, isLoading } = useAuth()

  // Form values and errors.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoadingProvider, setOAuthLoadingProvider] = useState<string | null>(null)
  const [enabledOAuthProviders, setEnabledOAuthProviders] = useState<string[]>([])
  const [accountDeletedNotice] = useState(() => {
    return sessionStorage.getItem('accountDeleted') === '1'
  })

  useEffect(() => {
    if (!accountDeletedNotice) {
      return
    }

    sessionStorage.removeItem('accountDeleted')
  }, [accountDeletedNotice])

  const oauthErrorMessage = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get('code')?.trim() ?? ''
    return getOAuthErrorMessage(t, code)
  }, [location.search, t])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('code')) {
      return
    }

    // Keep OAuth errors visible briefly, then clear stale query state.
    const timeoutId = window.setTimeout(() => {
      const nextParams = new URLSearchParams(location.search)
      nextParams.delete('code')
      const nextSearch = nextParams.toString()

      navigate(
        {
          pathname: location.pathname,
          search: nextSearch.length > 0 ? `?${nextSearch}` : '',
        },
        { replace: true }
      )
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [location.pathname, location.search, navigate])

  // If user comes back from provider callback (success or failure),
  // ensure OAuth buttons become active again.
  useEffect(() => {
    setOAuthLoadingProvider(null)
  }, [location.pathname, location.search])

  // Browser back/forward cache can restore the old component state after
  // returning from OAuth provider pages. Reset loading when page becomes active.
  useEffect(() => {
    const resetOAuthLoading = () => {
      setOAuthLoadingProvider(null)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetOAuthLoading()
      }
    }

    window.addEventListener('pageshow', resetOAuthLoading)
    window.addEventListener('focus', resetOAuthLoading)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pageshow', resetOAuthLoading)
      window.removeEventListener('focus', resetOAuthLoading)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadEnabledProviders = async () => {
      try {
        const response = await fetch('/api/auth/oauth/providers', {
          credentials: 'include',
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as OAuthProvidersResponse
        if (!cancelled && payload.success && Array.isArray(payload.data)) {
          setEnabledOAuthProviders(payload.data)
        }
      } catch {
        // Keep default state when provider list is unavailable.
      }
    }

    void loadEnabledProviders()

    return () => {
      cancelled = true
    }
  }, [])

  // Clear old errors.
  const clearErrors = () => {
    setEmailError('')
    setPasswordError('')
    setFormError('')
  }

  // Check fields before submit.
  const validateFields = (): boolean => {
    let isValid = true
    const trimmedEmail = email.trim()

    if (trimmedEmail.length === 0) {
      setEmailError(t('auth.errors.emailRequired'))
      isValid = false
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError(t('auth.errors.emailInvalid'))
      isValid = false
    }

    if (password.length === 0) {
      setPasswordError(t('auth.errors.passwordRequired'))
      isValid = false
    }

    return isValid
  }

  // Show API error in the right field.
  const applyApiError = (message: string) => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('invalid email or password')) {
      setEmailError(t('login.errors.invalidCredentials'))
      setPasswordError(t('login.errors.invalidCredentials'))
      return
    }

    if (lowerMessage.includes('email')) {
      setEmailError(message)
      return
    }

    if (lowerMessage.includes('password')) {
      setPasswordError(message)
      return
    }

    setFormError(message)
  }

  // Send login request.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Stop normal HTML form submit.
    event.preventDefault()

    // Remove old errors first.
    clearErrors()

    if (!validateFields()) {
      return
    }

  // Try login and handle errors.
    try {
      const normalizedEmail = email.trim()

      await login({
        email: normalizedEmail,
        password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        applyApiError(translateApiError(error, error.message))
        return
      }

      setFormError(t('common.unableToConnect'))
    }
  }

  const handleOAuthLogin = (provider: string) => {
    setOAuthLoadingProvider(provider)
    window.location.href = `/api/auth/oauth/${encodeURIComponent(provider)}`
  }

  return (
    <section className="mx-auto w-full max-w-md space-y-8">
      {/* Login header */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t('login.title')}</h1>
        <p className="text-slate-600">{t('login.subtitle')}</p>
      </div>

      {/* Login form */}
      <form className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl" onSubmit={handleSubmit} noValidate>
        {accountDeletedNotice ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700" role="status">
            {t('login.accountDeleted')}
          </p>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
            {t('auth.emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
            }}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder={t('auth.emailPlaceholder')}
          />
          <p className="text-xs text-slate-500">{t('auth.emailHint')}</p>
          {emailError.length > 0 ? <p className="text-xs font-medium text-pink-600">{emailError}</p> : null}
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
              autoComplete="current-password"
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
          {passwordError.length > 0 ? <p className="text-xs font-medium text-pink-600">{passwordError}</p> : null}
        </div>

        {oauthErrorMessage.length > 0 ? (
          <p className="rounded-lg bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-700 border border-amber-200/70">
            {oauthErrorMessage}
          </p>
        ) : null}

        {formError.length > 0 ? <p className="rounded-lg bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600 border border-red-200/50">{formError}</p> : null}

        <Button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50" type="submit" disabled={isLoading}>
          {isLoading ? t('login.signingIn') : t('login.signIn')}
        </Button>

        <div className="space-y-3">
          {OAUTH_PROVIDERS.map((provider) => (
            (() => {
              const isEnabled = enabledOAuthProviders.includes(provider.key)
              const isBusy = oauthLoadingProvider !== null

              return (
            <Button
              key={provider.key}
              type="button"
              onClick={() => {
                handleOAuthLogin(provider.key)
              }}
              disabled={isLoading || isBusy || !isEnabled}
              className="w-full rounded-lg border border-purple-300/60 bg-white/80 py-3 font-semibold text-purple-800 shadow-sm hover:bg-white disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {getOAuthProviderIcon(provider.key)}
                <span>
                  {oauthLoadingProvider === provider.key
                    ? t('login.redirectingTo', { provider: provider.label })
                    : isEnabled
                      ? t('login.continueWith', { provider: provider.label })
                      : t('login.notConfigured', { provider: provider.label })}
                </span>
              </span>
            </Button>
              )
            })()
          ))}
        </div>

        <p className="text-center text-sm text-slate-600">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-purple-700 hover:text-purple-900">
            {t('login.registerLink')}
          </Link>
        </p>
      </form>
    </section>
  )
}
