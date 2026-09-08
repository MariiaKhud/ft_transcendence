import { AppError } from '../middleware/error.middleware.js'
import { ErrorCode } from './error-codes.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const validateUuid = (value: string, fieldName = 'id') => {
  if (!UUID_REGEX.test(value)) {
    throw new AppError(
        400,
        ErrorCode.VALIDATION_INVALID_UUID,
        `Validation failed: ${fieldName} must be a valid UUID`
    )
  }
}
