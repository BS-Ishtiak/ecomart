import { Response } from 'express';

export interface ApiResponse<T = null> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: string[] | null;
}

// Success response
export const successResponse = <T>(
  res: Response,
  statusCode: number,
  data: T | null,
  message: string
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    errors: null,
  });
};

// Error response
export const errorResponse = (
  res: Response,
  statusCode: number,
  errors: string | string[],
  message: string | null = null
): Response => {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors: errorArray,
  });
};

// Generic database error handler
export const handleDatabaseError = (err: any, res: Response): Response => {
  if (err?.code === '23505') {
    return errorResponse(res, 400, 'Email already exists!');
  }
  console.error('Database error:', err?.message || err);
  return errorResponse(res, 500, 'Server error');
};

// Generic server error handler
export const handleServerError = (err: any, res: Response): Response => {
  console.error('Server error:', err?.message || err);
  return errorResponse(res, 500, err?.message || 'Internal server error');
};

// Validation error handler
export const handleValidationError = (errors: string[], res: Response): Response => {
  return errorResponse(res, 400, errors);
};

// Unauthorized error handler
export const handleUnauthorizedError = (res: Response, message: string = 'Unauthorized'): Response => {
  return errorResponse(res, 401, message);
};

// Forbidden error handler
export const handleForbiddenError = (res: Response, message: string = 'Forbidden'): Response => {
  return res.status(403).json({
    error: message,
  });
};

// Not found error handler
export const handleNotFoundError = (res: Response, message: string = 'Not found'): Response => {
  return errorResponse(res, 404, message);
};
