import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore, type AuthUser } from '@/store/authStore'

interface LoginResponse {
  success: boolean
  data?: AuthUser
  error?: string
}

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore(function selectSetUser(state) {
    return state.setUser
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function clearErrors() {
    setEmailError('')
    setPasswordError('')
    setFormError('')
  }

  function validateFields(): boolean {
    let isValid = true
    const trimmedEmail = email.trim()

    if (trimmedEmail.length === 0) {
      setEmailError('Email is required')
      isValid = false
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email')
      isValid = false
    }

    if (password.length === 0) {
      setPasswordError('Password is required')
      isValid = false
    }

    return isValid
  }

  function applyApiError(message: string) {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('email')) {
      setEmailError(message)
      return
    }

    if (lowerMessage.includes('password')) {
      setPasswordError(message)
      return
    }

    if (lowerMessage.includes('invalid email or password')) {
      setEmailError('Invalid email or password')
      setPasswordError('Invalid email or password')
      return
    }

    setFormError(message)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearErrors()

    if (!validateFields()) {
      return
    }

    try {
      setIsSubmitting(true)
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const payload = (await response.json()) as LoginResponse

      if (!response.ok || !payload.success || !payload.data) {
        applyApiError(payload.error ?? 'Login failed')
        return
      }

      setUser(payload.data)
      navigate('/feed', { replace: true })
    } catch {
      setFormError('Unable to connect to the server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-md space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
        <p className="text-slate-600">Sign in to your account to continue</p>
      </div>

      <form className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={function onEmailChange(event) {
              setEmail(event.target.value)
            }}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder="you@example.com"
          />
          {emailError.length > 0 ? <p className="text-xs font-medium text-red-500">{emailError}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={function onPasswordChange(event) {
              setPassword(event.target.value)
            }}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder="Enter your password"
          />
          {passwordError.length > 0 ? <p className="text-xs font-medium text-red-500">{passwordError}</p> : null}
        </div>

        {formError.length > 0 ? <p className="rounded-lg bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600 border border-red-200/50">{formError}</p> : null}

        <Button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </section>
  )
}
