import { SESSION_COOKIE_NAME } from 'app/constants/session.js';
import * as authRepo from 'app/repositories/auth/auth.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import type { NextFunction, Request, Response } from 'express';

export async function loadSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    next();
    return;
  }
  try {
    const user = await authRepo.getSessionWithUser(token);
    if (user) req.user = user;
  } catch (err) {
    logger.error(
      { err },
      'Session lookup failed, continuing as unauthenticated',
    );
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  next();
}
