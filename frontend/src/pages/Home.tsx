import { Link } from 'react-router-dom'            // For the Link component from react-router-dom, which is used to create navigational links in the React application, allowing users to navigate between different routes defined in the router configuration without causing a full page reload.
import { Button } from '@/components/ui/button'    // For the Button component from the local UI components, which is likely a styled button component used for consistent styling across the application. In this case, it is used to create buttons for navigating to the login page and for learning more about the application on the home page.

/**
 * @brief The Home component represents the home page of the application, which displays a hero section with a welcome message and call-to-action buttons. It uses the Link
 * component from react-router-dom for navigation and the Button component from the local UI library for consistent styling. The component is styled using Tailwind CSS classes
 * to create a visually appealing layout for the home page.
 * @function Home
 * @returns {JSX.Element} The JSX element representing the home page, including a hero section and call-to-action buttons.
 */
export function Home() {
  return (
    <section className="grid gap-12 text-center">
      {/* Hero headline */}
      <div className="mx-auto space-y-6">
        <div className="space-y-4">
          <div className="inline-block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-600">Welcome</p>
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl">
            Connect. Share. Grow.
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-slate-600">
            A transcendent experience built with modern web technologies and designed for the future.
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <Link to="/login">Get Started</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-2 border-purple-300 px-8 py-3 text-base font-semibold hover:bg-purple-50">
          <a href="#learn-more">Learn More</a>
        </Button>
      </div>

      {/* Decorative arrow */}
      <div className="flex justify-center pt-8">
        <svg className="h-8 w-8 animate-bounce text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}
