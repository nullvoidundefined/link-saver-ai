import cors from 'cors';

const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
const origin = rawOrigin.includes(',')
  ? rawOrigin.split(',').map((o) => o.trim())
  : rawOrigin;

export const corsConfig = cors({
  credentials: true,
  origin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 7200,
});
