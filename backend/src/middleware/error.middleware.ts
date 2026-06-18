import type { Request, Response, NextFunction } from 'express'


export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error('Server error:', err)
    }

    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
  }

  console.error('Unexpected error:', err)

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>

export const handleAsyncErrors = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
