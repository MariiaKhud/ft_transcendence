import { Request, Response, NextFunction } from 'express';   // For type annotations in Express middleware functions
import { AppError } from './error.middleware.js';                   // Importing the AppError class for throwing custom errors with specific status codes and messages
import { verifyAuthToken } from '../routes/auth.routes.js';      // Importing the verifyAuthToken function from the authRoutes module, which is used to verify the JWT token and extract user information for authentication purposes

type AuthRole = 'USER' | 'MODERATOR' | 'ADMIN';              // Defining a TypeScript type for user roles, which can be one of 'USER', 'MODERATOR', or 'ADMIN'. This will be used to enforce role-based access control in the application.

// Extending the Express Request interface to include a user property that will hold the authenticated user's information (userId and csrfToken) after successful authentication.
// This allows route handlers to access the authenticated user's details through req.user.
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: AuthRole;
        csrfToken: string;
      };
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Read the authentication token from the cookies
  const token = req.cookies.auth_token;

  if (!token) {
    throw new AppError(401, 'Missing authentication token');
  }

  try {
    const decoded = verifyAuthToken(token);

	// Attach the user information (userId and csrfToken) to the req.user property for use in subsequent route handlers
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      csrfToken: decoded.csrfToken,
    };
    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token');
  }
}

export { authMiddleware };




// Express middleware is a function between request and route handler.

// Express middleware function that checks for the presence of an authentication token in the cookies of incoming requests, verifies it,
// and attaches user information to the request object for use in subsequent route handlers. If the token is missing or invalid, it throws
// an AppError with a 401 status code indicating that authentication is required.
