import { Link } from 'react-router-dom'          // For the Link component from react-router-dom, which is used to create navigational links in the React application, allowing users to navigate between different routes defined in the router configuration without causing a full page reload.
import { Button } from '@/components/ui/button'  // For the Button component from the local UI components, which is likely a styled button component used for consistent styling across the application. In this case, it is used to create a button that allows users to navigate back to the home page from the 404 Not Found page.

/**
 * @brief The NotFound component represents a 404 error page that is displayed when a user navigates to a route that does not exist in the application. It provides
 * a user-friendly message indicating that the requested page was not found and includes a button that allows users to navigate back to the home page. The component
 * is styled using Tailwind CSS classes to create an appealing and responsive design, with a focus on clear typography and visual hierarchy to effectively communicate
 * the error message to the user.
 * @function NotFound
 * @returns {JSX.Element} The rendered NotFound component, which includes a message about the 404 error and a button to navigate back to the home page.
 */
export function NotFound() {
  return (
    <section className="mx-auto grid w-full max-w-xl gap-8 text-center">
      <div className="space-y-4">
        <p className="inline-block rounded-full bg-gradient-to-r from-pink-100 to-purple-100 px-4 py-2 text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">404</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Page Not Found</h1>
        <p className="text-lg text-slate-600">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <div className="flex justify-center pt-4">
        <Button asChild className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </section>
  )
}
