import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
  },
  // SQLite database (no external dependencies)
  database: {
    path: process.env.DB_PATH || './data/fever_plans.db',
  },
  // In-memory cache (no Redis needed)
  cache: {
    searchTtl: parseInt(process.env.CACHE_SEARCH_TTL || '300'), // 5 minutes
    statsTtl: parseInt(process.env.CACHE_STATS_TTL || '60'), // 1 minute
  },
  provider: {
    url: process.env.PROVIDER_URL || 'https://provider.code-challenge.feverup.com/api/events',
    timeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS || '10000'),
    retries: parseInt(process.env.PROVIDER_RETRIES || '3'),
  },
  sync: {
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '300000'), // 5 minutes
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
  },
};