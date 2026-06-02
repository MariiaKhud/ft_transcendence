import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <section className="grid gap-6">
      <p className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
        React + Vite + Tailwind + shadcn/ui
      </p>
      <div className="grid gap-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Frontend setup is ready.
        </h1>
        <p className="max-w-2xl text-balance text-lg text-slate-600">
          You now have a TypeScript React app with Tailwind CSS, shadcn-ready utilities, and
          React Router configured as a base for feature pages.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/login">Go to Login Route</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="https://ui.shadcn.com/docs" target="_blank" rel="noreferrer">
            shadcn/ui docs
          </a>
        </Button>
      </div>
    </section>
  )
}
