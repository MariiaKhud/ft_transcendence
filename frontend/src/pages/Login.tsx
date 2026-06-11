import { useState, type FormEvent } from 'react'                // Importing useState and FormEvent type from React for managing component state and typing form events
import { useNavigate } from 'react-router-dom'                  // Importing useNavigate from react-router-dom for programmatic navigation after successful login
import { Button } from '@/components/ui/button'                 // Importing a Button component from the local UI components for consistent styling of buttons across the application
import { useAuthStore, type AuthUser } from '@/store/authStore' // Importing the useAuthStore hook and AuthUser type from the local authStore for managing authentication state and typing the user object

// Defining a TypeScript interface for the expected response from the login API, which includes a success boolean, an optional data object of type AuthUser,
// and an optional error message string
interface LoginResponse {
  success: boolean
  data?: AuthUser
  error?: string
}

/**
 * @brief A utility function to validate email addresses using a regular expression. It checks if the provided email string matches the common pattern for valid emailaddresses.
 * @function validateEmail
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if the email is valid, false otherwise. 
 */
function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * @brief The Login component is a React functional component that renders a login form for users to enter their email and password. It manages the form state using
 * useState hooks, validates the input fields, and handles form submission by making a POST request to the login API endpoint. If the login is successful, it updates
 * the authentication state using the useAuthStore hook and navigates the user to the feed page. If there are any validation errors or API errors, it displays
 * appropriate error messages to the user.
 * @function Login
 * @returns {JSX.Element} The rendered Login component with a form for user authentication.
 */
export function Login() {
  const navigate = useNavigate() // Using the useNavigate hook from react-router-dom to programmatically navigate to different routes after successful login

  // Accessing the setUser function from the authentication store to update the user information upon successful login
  const setUser = useAuthStore(
	function selectSetUser(state) {
    return state.setUser
  })

  // State variables for managing form input values, error messages, and submission status
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Function to clear all error messages before validating or submitting the form
  function clearErrors() {
    setEmailError('')
    setPasswordError('')
    setFormError('')
  }

  // Function to validate the email and password fields, setting appropriate error messages if validation fails.
  // It checks if the email is not empty and follows a valid email format, and if the password is not empty. It returns a boolean indicating whether the fields are valid.
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

  // Function to apply API error messages to the appropriate form fields
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

  // Asynchronous function to handle form submission, which prevents the default form behavior, validates the fields, and if valid, sends a POST request to the login
  // API endpoint. It handles the API response, updating the authentication state and navigating to the feed page on success, or applying error messages on failure.
  // It also manages the submission state to provide feedback to the user.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

	// Preventing the default form submission behavior to handle it with custom logic
    event.preventDefault()

	// Clearing any existing error messages before validating the form fields
    clearErrors()

    if (!validateFields()) {
      return
    }

	// Wrapping the API call in a try-catch block to handle any network or server errors that may occur during the login process
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

	  // Parsing the JSON response from the API and typing it as LoginResponse to ensure we have the expected structure for success, data, and error properties
      const payload = (await response.json()) as LoginResponse

	  // Checking if the response is not OK, or if the success property is false, or if the data is missing. If any of these conditions are true, it applies the error message
	  // from the API
      if (!response.ok || !payload.success || !payload.data) {
        applyApiError(payload.error ?? 'Login failed')
        return
      }

	  // If the login is successful, it updates the authentication state with the user data from the API response and navigates the user to the feed page
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
