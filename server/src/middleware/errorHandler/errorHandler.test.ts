import { errorHandler } from 'app/middleware/errorHandler/errorHandler.js';
import { ApiError } from 'app/utils/ApiError.js';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn() },
}));

function createApp() {
  const app = express();
  app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
    next(new Error('kaboom'));
  });
  app.get(
    '/not-found',
    (_req: Request, _res: Response, next: NextFunction) => {
      next(ApiError.notFound('Widget not found'));
    },
  );
  app.get(
    '/bad-request-details',
    (_req: Request, _res: Response, next: NextFunction) => {
      next(
        ApiError.badRequest('Validation failed', {
          fields: { name: 'required' },
        }),
      );
    },
  );
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('returns 500 INTERNAL_ERROR for unknown errors', async () => {
    const res = await request(createApp()).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('ApiError.notFound returns 404 NOT_FOUND', async () => {
    const res = await request(createApp()).get('/not-found');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'NOT_FOUND',
      message: 'Widget not found',
    });
  });

  it('ApiError with details returns structured response', async () => {
    const res = await request(createApp()).get('/bad-request-details');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { fields: { name: 'required' } },
    });
  });
});
