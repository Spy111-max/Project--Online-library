/**
 * index.ts — Express application entry point
 * ─────────────────────────────────────────────────────────────
 * Run in development: npm run dev (from the /server directory)
 * Listens on PORT (default: 3001)
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env BEFORE importing any service that reads process.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRouter from './routes/auth';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Middleware ────────────────────────────────────────────────

// CORS — allow requests from local dev, configured FRONTEND_URL, and Vercel preview/production urls
const allowedOrigins = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
];
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => allowedOrigins.push(url.trim()));
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed =
        allowedOrigins.some((allowed) => {
          const cleanAllowed = allowed.replace(/\/$/, '');
          return cleanOrigin.toLowerCase() === cleanAllowed.toLowerCase();
        }) ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin.includes('vercel.app');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parse JSON bodies (max 2 MB to prevent large payload attacks)
app.use(express.json({ limit: '2mb' }));

// Basic security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── Routes ────────────────────────────────────────────────────

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRouter);

// 404 catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Virtual Library API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Auth:   http://localhost:${PORT}/api/auth/*\n`);
});

export default app;
