import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PlansService } from '../services/PlansService';
import { logger } from '../utils/logger';

export class SearchController {
  constructor(private plansService: PlansService) {}

  async search(req: Request, res: Response): Promise<void> {
    const requestStartTime = Date.now();

    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request parameters',
          details: errors.array()
        });
        return;
      }

      const { starts_at, ends_at } = req.query as { starts_at: string; ends_at: string };
      
      // Parse dates
      const startDate = new Date(starts_at);
      const endDate = new Date(ends_at);

      // Additional business logic validation
      await this.plansService.validateDateRange(startDate, endDate);

      // Perform the search
      const plans = await this.plansService.searchPlans(startDate, endDate);
      
      const responseTime = Date.now() - requestStartTime;

      // Log successful search
      logger.info('Search request completed', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        resultCount: plans.length,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Send response
      res.json({
        data: plans,
        meta: {
          count: plans.length,
          responseTime: `${responseTime}ms`
        }
      });

    } catch (error) {
      const responseTime = Date.now() - requestStartTime;
      
      logger.error('Search request failed', {
        error: error instanceof Error ? error.message : error,
        responseTime: `${responseTime}ms`,
        query: req.query,
        ip: req.ip,
      });

      if (error instanceof Error && error.message.includes('date')) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to search plans'
        });
      }
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'fever-plans-microservice'
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable'
      });
    }
  }
}