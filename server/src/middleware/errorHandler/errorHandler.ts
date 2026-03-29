import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { NextFunction, Request, Response } from 'express';

// Centralized error handler to ensure all uncaught errors are logged once and surfaced with a safe JSON response.

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    logger.error(
      { err, reqId: req.id, statusCode: err.statusCode, errorCode: err.code },
      'Request failed',
    );
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unknown errors
  logger.error({ err, reqId: req.id }, 'Unhandled error in request handler');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}
