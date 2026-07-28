import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const ServerError = () => {
  return (
    <section className="mx-auto grid w-full max-w-xl gap-8 text-center">
      {/* Error message */}
      <div className="space-y-4">
        <p className="inline-block rounded-full bg-gradient-to-r from-pink-100 to-purple-100 px-4 py-2 text-sm font-bold text-purple-700">500</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Something Went Wrong</h1>
        <p className="text-lg text-slate-600">
          An unexpected error occurred while loading this page. Please try again.
        </p>
      </div>
      {/* Back home CTA */}
      <div className="flex justify-center pt-4">
        <Button asChild className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <Link to="/">Back to Feed</Link>
        </Button>
      </div>
    </section>
  )
}
