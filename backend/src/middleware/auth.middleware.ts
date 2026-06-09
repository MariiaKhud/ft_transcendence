import { Request, Response, NextFunction } from 'express';   // For type annotations in Express middleware functions
import { AppError } from './errorHandler';                   // Importing the AppError class for throwing custom errors with specific status codes and messages
import { verifyAuthToken } from '../routes/authRoutes';      // Importing the verifyAuthToken function from the authRoutes module, which is used to verify the JWT token and extract user information for authentication purposes

// Extending the Express Request interface to include a user property that will hold the authenticated user's information (userId and csrfToken) after successful authentication.
// This allows route handlers to access the authenticated user's details through req.user.
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        csrfToken: string;
      };
    }
  }
}

/**
 * @brief authMiddleware is an Express middleware function that checks for the presence of an authentication token in the cookies of incoming requests.
 * It verifies the token using the verifyAuthToken function, extracts the user information (userId and csrfToken), and attaches it to the req.user property for use
 * in subsequent route handlers. If the token is missing or invalid, it throws an AppError with a 401 status code indicating that authentication is required.
 * @function authMiddleware
 * @param {Request} req - The Express Request object containing the cookies with the authentication token.
 * @param {Response} res - The Express Response object used to send responses back to the client (not used in this middleware).
 * @param {NextFunction} next - The Express NextFunction used to pass control to the next middleware or route handler.
 * @throws {AppError} Throws an AppError with a 401 status code if the authentication token is missing or invalid.
 */
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Read the authentication token from the cookies
  const token = req.cookies.auth_token;

  if (!token) {
    throw new AppError(401, 'Missing authentication token');
  }

  try {
    const decoded = verifyAuthToken(token);
    req.user = {
      userId: decoded.userId,
      csrfToken: decoded.csrfToken,
    };
    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token');
  }
}

export { authMiddleware };
