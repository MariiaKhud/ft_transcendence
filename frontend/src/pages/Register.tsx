import { useState, type FormEvent } from 'react'      // Importing necessary hooks and types from React for managing state and handling form events in the Register component
import { Link, useNavigate } from 'react-router-dom'  // Importing Link and useNavigate from react-router-dom for navigation between routes in the React application. Link is used to create navigational links, while useNavigate is a hook that provides a function to programmatically navigate to different routes.
import { Button } from '@/components/ui/button'       // Importing the Button component from the local UI components, which is likely a styled button component used for consistent styling across the application. In this case, it is used to create buttons for submitting the registration form and navigating to the login page.
import { registerUser } from '@/api/authApi'

const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateUsername = (username: string) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  return usernameRegex.test(username)
}

export const Register = () => {

  // Using the useNavigate hook to get a navigate function that can be used to programmatically navigate to different routes in the application, such as redirecting
  // the user to the login page after successful registration.
  const navigate = useNavigate()

  // Using useState hooks to manage the state of form inputs (email, username, password, confirmPassword), error messages for each field, a general form error message,
  // a boolean to track the submission status, and a boolean to toggle password visibility.
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // clearErrors is a helper function that resets all error messages to an empty string. It is called before validating the form fields or submitting the form
  // to ensure that previous error messages do not persist.
  const clearErrors = () => {
    setEmailError('')
    setUsernameError('')
    setPasswordError('')
    setConfirmPasswordError('')
    setFormError('')
  }

  // validateFields is a function that checks the validity of the form inputs. It ensures that the email is in a valid format, the username meets the specified criteria,
  // the password is of an acceptable length, and that the confirm password field matches the password. If any validation fails, it sets the appropriate error messages
  // and returns false to indicate that the form is not valid for submission.
  const validateFields = () => {
    let isValid = true
    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    if (trimmedEmail.length === 0) {
      setEmailError('Email is required')
      isValid = false
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email')
      isValid = false
    }

    if (trimmedUsername.length === 0) {
      setUsernameError('Username is required')
      isValid = false
    } else if (!validateUsername(trimmedUsername)) {
      setUsernameError('Username must be 3-20 chars and only letters, numbers, or _')
      isValid = false
    }

    if (password.length === 0) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 8 || password.length > 72) {
      setPasswordError('Password must be between 8 and 72 characters')
      isValid = false
    }

    if (confirmPassword.length === 0) {
      setConfirmPasswordError('Please confirm your password')
      isValid = false
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match')
      isValid = false
    }

    return isValid
  }

  // applyApiError is a helper function that maps API error messages to the corresponding form fields. It checks the error message for keywords
  // like "email", "username", or "password" and sets the appropriate error state. If no specific field is mentioned, it sets a general form error.
  const applyApiError = (message: string) => {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('email')) {
      setEmailError(message)
      return
    }

    if (lowerMessage.includes('username')) {
      setUsernameError(message)
      return
    }

    if (lowerMessage.includes('password')) {
      setPasswordError(message)
      return
    }

    setFormError(message)
  }

  // handleSubmit is an asynchronous function that handles the form submission event. It prevents the default form submission behavior,
  // clears any existing error messages, validates the form fields, and sends a POST request to the registration API endpoint. If the registration
  // is successful, it navigates the user to the login page. If there are any errors, it applies the appropriate error messages.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
	// Prevent the default form submission behavior to handle it with JavaScript
    event.preventDefault()
	// Clear any existing error messages before validating the form fields or submitting the form
    clearErrors()

	// Validate the form fields and if any validation fails, return early to prevent submission
    if (!validateFields()) {
      return
    }

    // Try to submit the registration data to the API endpoint. If successful, navigate to the login page. If there are errors, apply the appropriate error messages.
    try {
      setIsSubmitting(true)
      await registerUser({
        email,
        username,
        password,
      })

	  // If registration is successful, navigate the user to the login page
      navigate('/login', { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        applyApiError(error.message)
        return
      }

      setFormError('Unable to connect to the server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-md space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Create Account</h1>
        <p className="text-slate-600">Register to start using the platform</p>
      </div>

      <form
        className="space-y-6 rounded-2xl border border-white/30 bg-white/40 p-8 backdrop-blur-md shadow-xl"
        onSubmit={handleSubmit}
        noValidate
      >
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
          {emailError.length > 0 ? <p className="text-xs font-medium text-red-500">{emailError}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-semibold text-slate-900">
            Username
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
            className="w-full rounded-lg border border-purple-200/50 bg-white/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300/50 transition-all"
            placeholder="your_username"
          />
          {usernameError.length > 0 ? <p className="text-xs font-medium text-red-500">{usernameError}</p> : null}
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
              autoComplete="new-password"
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
          {passwordError.length > 0 ? <p className="text-xs font-medium text-red-500">{passwordError}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-900">
            Confirm Password
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
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => {
                setShowConfirmPassword(!showConfirmPassword)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-700 hover:text-purple-900"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
          {confirmPasswordError.length > 0 ? (
            <p className="text-xs font-medium text-red-500">{confirmPasswordError}</p>
          ) : null}
        </div>

        {formError.length > 0 ? (
          <p className="rounded-lg border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-600">
            {formError}
          </p>
        ) : null}

        <Button
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-purple-700 hover:text-purple-900">
            Sign in
          </Link>
        </p>
      </form>
    </section>
  )
}
