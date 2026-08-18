import { Response } from 'express'
import { AppError } from '../middleware/error.middleware.js'

export function sendSuccess<T>(
  res: Response,
  status: number,
  data?: T,
) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
  })
}

export function sendError(
  res: Response,
  error: unknown,
  defaultStatus = 500,
) {
  const status = error instanceof AppError ? error.statusCode : defaultStatus

  return res.status(status).json({
    success: false,
    data: null,
    error: error instanceof Error ? error.message : 'Unknown error',
  })
}
