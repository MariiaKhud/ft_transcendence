import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const Home = () => {
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
