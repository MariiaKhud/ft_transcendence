import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

const PASSWORD_HELP_TEXT = '8-72 chars, use lowercase, uppercase, and digits'

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const Login = () => {
  // Move user to another page after login.
  const navigate = useNavigate()

  const { login, isLoading } = useAuth()

  // Form values and errors.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

  // Show API error in the right field.
  const applyApiError = (message: string) => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('invalid email or password')) {
      setEmailError('Invalid email or password')
      setPasswordError('Invalid email or password')
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
        applyApiError(error.message)
        return
      }

      setFormError('Unable to connect to the server')
    }
  }

  return (
    <section className="mx-auto w-full max-w-md space-y-8">
      {/* Login header */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
        <p className="text-slate-600">Sign in to your account to continue</p>
      </div>

      {/* Login form */}
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
            onChange={(event) => {
              setEmail(event.target.value)
            }}
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder="you@example.com"
          />
          <p className="text-xs text-slate-500">Valid email format required (e.g., user@example.com)</p>
          {emailError.length > 0 ? <p className="text-xs font-medium text-red-500">{emailError}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
            Password
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
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword(!showPassword)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-700 hover:text-purple-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            <p className="text-xs text-slate-500">{PASSWORD_HELP_TEXT}</p>
            <p className="text-xs text-slate-400">{password.length} / 72</p>
          </div>
          {passwordError.length > 0 ? <p className="text-xs font-medium text-red-500">{passwordError}</p> : null}
        </div>

        {formError.length > 0 ? <p className="rounded-lg bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600 border border-red-200/50">{formError}</p> : null}

        <Button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50" type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-purple-700 hover:text-purple-900">
            Register
          </Link>
        </p>
      </form>
    </section>
  )
}
