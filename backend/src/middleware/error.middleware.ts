import type { Request, Response, NextFunction } from 'express'
import { ErrorCode, type ErrorCodeValue } from '../lib/error-codes.js'


export class AppError extends Error {
  // `code` is a stable, machine-readable identifier the frontend maps to a
  // translated message; `message` is the English text (used for server logs
  // and as the API's `error` field, kept for backward compatibility).
  constructor(public statusCode: number, public code: ErrorCodeValue, message: string) {
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
      code: err.code,
      error: err.message,
    })
  }

  console.error('Unexpected error:', err)

  res.status(500).json({
    success: false,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    error: 'Internal server error',
  })
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>

export const handleAsyncErrors = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
