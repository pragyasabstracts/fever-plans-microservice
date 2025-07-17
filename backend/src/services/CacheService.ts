import { logger } from '../utils/logger';

interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async initialize(): Promise<void> {
    logger.info('In-memory cache service initialized successfully');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }

      // Check if expired
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }

      return item.data as T;
    } catch (error) {
      logger.error('Cache get operation failed:', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      const expiry = Date.now() + (ttlSeconds * 1000);
      this.cache.set(key, { data: value, expiry });
      return true;
    } catch (error) {
      logger.error('Cache set operation failed:', { key, ttl: ttlSeconds, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      return this.cache.delete(key);
    } catch (error) {
      logger.error('Cache delete operation failed:', { key, error });
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      this.cache.clear();
      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Cache clear operation failed:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  generateSearchKey(startDate: Date, endDate: Date): string {
    return `search:${startDate.toISOString()}:${endDate.toISOString()}`;
  }

  generateStatsKey(): string {
    return 'stats:general';
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    logger.info('In-memory cache service closed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test basic cache operations
      const testKey = '__health_check__';
      await this.set(testKey, 'test', 1);
      const result = await this.get(testKey);
      await this.del(testKey);
      return result === 'test';
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return true; // Always connected for in-memory cache
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      type: 'in-memory'
    };
  }
}