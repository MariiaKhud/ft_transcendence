import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { NotFound } from '@/pages/NotFound'
import { ServerError } from '@/pages/ServerError'

// Catches errors thrown while rendering/loading routes (e.g. a page crashing,
// a lazy chunk failing to load). Kept as a plain, non-lazy import so it can
// still render even if lazy-loading itself is what failed.
export const RouteErrorBoundary = () => {
  const error = useRouteError()

  if (import.meta.env.DEV) {
    console.error(error)
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />
  }

  return <ServerError />
}
