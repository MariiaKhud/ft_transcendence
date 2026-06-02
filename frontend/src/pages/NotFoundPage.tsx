import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="grid gap-4 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Page not found</h1>
      <p className="text-slate-600">The route you requested does not exist yet.</p>
      <div>
        <Button asChild variant="outline">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </section>
  )
}
