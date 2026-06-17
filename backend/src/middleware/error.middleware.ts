import type { Express, Request, Response, NextFunction } from 'express' // For type annotations in Express middleware functions


export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    })
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
}

export const handleAsyncErrors = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
