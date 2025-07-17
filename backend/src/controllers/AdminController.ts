import { Request, Response } from 'express';
import { PlansService } from '../services/PlansService';
import { DatabaseService } from '../services/DatabaseService';
import { CacheService } from '../services/CacheService';
import { ProviderService } from '../services/ProviderService';
import { logger } from '../utils/logger';

export class AdminController {
  constructor(
    private plansService: PlansService,
    private databaseService: DatabaseService,
    private cacheService: CacheService,
    private providerService: ProviderService
  ) {}

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.plansService.getStats();
      
      // Add additional runtime information
      const enhancedStats = {
        ...stats,
        cacheStatus: this.cacheService.getConnectionStatus(),
        syncStatus: this.plansService.getSyncStatus(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };

      logger.info('Stats request completed', {
        ip: req.ip,
        totalPlans: stats.totalPlans,
      });

      res.json(enhancedStats);
    } catch (error) {
      logger.error('Failed to get stats', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve statistics'
      });
    }
  }

  async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      const syncStatus = this.plansService.getSyncStatus();
      
      if (syncStatus.isSyncing) {
        res.status(409).json({
          error: 'Sync In Progress',
          message: 'A sync operation is already in progress'
        });
        return;
      }

      logger.info('Manual sync triggered', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Trigger sync (don't await to return response quickly)
      this.plansService.syncPlans().catch(error => {
        logger.error('Manual sync failed', { error });
      });

      res.json({
        message: 'Sync operation started successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to trigger sync', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to start sync operation'
      });
    }
  }

  async getDetailedHealth(_req: Request, res: Response): Promise<void> {
    try {
      const [dbHealth, cacheHealth, providerHealth] = await Promise.allSettled([
        this.databaseService.healthCheck(),
        this.cacheService.healthCheck(),
        this.providerService.healthCheck(),
      ]);

      const healthStatus = {
        overall: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: {
            status: dbHealth.status === 'fulfilled' && dbHealth.value ? 'healthy' : 'unhealthy',
            error: dbHealth.status === 'rejected' ? dbHealth.reason?.message : null,
          },
          cache: {
            status: cacheHealth.status === 'fulfilled' && cacheHealth.value ? 'healthy' : 'unhealthy',
            error: cacheHealth.status === 'rejected' ? cacheHealth.reason?.message : null,
          },
          provider: {
            status: providerHealth.status === 'fulfilled' && providerHealth.value ? 'healthy' : 'unhealthy',
            error: providerHealth.status === 'rejected' ? providerHealth.reason?.message : null,
          },
        },
        sync: this.plansService.getSyncStatus(),
      };

      // Determine overall health
      const allServicesHealthy = Object.values(healthStatus.services).every(
        service => service.status === 'healthy'
      );

      if (!allServicesHealthy) {
        // If database is down, service is critical
        if (healthStatus.services.database.status === 'unhealthy') {
          healthStatus.overall = 'critical';
        } else {
          healthStatus.overall = 'degraded';
        }
      }

      const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                        healthStatus.overall === 'degraded' ? 200 : 503;

      res.status(statusCode).json(healthStatus);

    } catch (error) {
      logger.error('Detailed health check failed', { error });
      
      res.status(503).json({
        overall: 'critical',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const cleared = await this.cacheService.clear();
      
      if (cleared) {
        logger.info('Cache cleared manually', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.json({
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          error: 'Cache Unavailable',
          message: 'Cache service is not available'
        });
      }

    } catch (error) {
      logger.error('Failed to clear cache', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clear cache'
      });
    }
  }

  async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      // Return non-sensitive configuration for debugging
      const safeConfig = {
        server: {
          port: process.env.PORT,
          env: process.env.NODE_ENV,
        },
        provider: {
          url: this.providerService.getProviderUrl(),
          timeout: this.providerService.getTimeout(),
        },
        sync: {
          intervalMs: process.env.SYNC_INTERVAL_MS,
        },
        cache: {
          searchTtl: process.env.CACHE_SEARCH_TTL,
          statsTtl: process.env.CACHE_STATS_TTL,
        },
        database: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          name: process.env.DB_NAME,
          // Never expose password or sensitive data
        },
      };

      res.json(safeConfig);
    } catch (error) {
      logger.error('Failed to get config', { error });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve configuration'
      });
    }
  }
}