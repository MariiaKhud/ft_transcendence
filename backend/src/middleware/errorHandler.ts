/**
 * @file errorHandler.ts
 * @description This file defines the AppError class for custom error handling and the errorHandler middleware function
 * for centralized error management in the Express application. It also includes an asyncHandler function to wrap
 * asynchronous route handlers and catch errors without needing try-catch blocks in each handler.
 */




// Importing necessary types from Express for type annotations in the middleware functions
import type { Express, Request, Response, NextFunction } from 'express'


/**
 * @brief AppError is a custom error class that extends the built-in Error class. It includes
 * a statusCode property to specify the HTTP status code associated with the error, allowing for
 * more informative error responses in the API.
 * @class AppError
 * @extends Error
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @constructor
 * @param {number} statusCode - The HTTP status code to be set for the error.
 * @param {string} message - The error message describing the error.
 */
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * @brief errorHandler is an Express middleware function that handles errors thrown in the application.
 * It checks if the error is an instance of AppError and responds with the appropriate status code and
 * message. For unexpected errors, it responds with a generic 500 Internal Server Error message.
 * @function errorHandler
 * @param {Error | AppError} err - The error object thrown in the application.
 * @param {Request} _req - The Express Request object (not used in this middleware).
 * @param {Response} res - The Express Response object used to send the error response.
 * @param {NextFunction} _next - The Express NextFunction (not used in this middleware).
 */
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

/**
 * @brief asyncHandler is a utility function that wraps asynchronous route handlers in Express.
 * It allows developers to write asynchronous code without needing to use try-catch blocks in each
 * handler. If an error is thrown in the asynchronous function, it will be caught and passed to the
 * next middleware (error handler).
 * @function asyncHandler
 * @param {Function} fn - The asynchronous function (route handler) to be wrapped.
 * @returns {Function} A new function that wraps the original function and handles errors.
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
