import { Button } from '@/components/ui/button'

export function LoginPage() {
  return (
    <section className="mx-auto w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Login</h1>
      <p className="mt-2 text-sm text-slate-600">
        Base route is configured. Replace this with your auth form.
      </p>
      <Button className="mt-6 w-full">Continue</Button>
    </section>
  )
}
