import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { logger } from './utils/logger';
import { ErrorHandler } from './middleware/ErrorHandler';
import { createRoutes } from './routes';

// Services
import { DatabaseService } from './services/DatabaseService';
import { CacheService } from './services/CacheService';
import { ProviderService } from './services/ProviderService';
import { PlansService } from './services/PlansService';

// Controllers
import { SearchController } from './controllers/SearchController';
import { AdminController } from './controllers/AdminController';

// Swagger documentation
import * as swaggerDocument from '../docs/swagger.json';

export class FeverPlansApp {
  public app: express.Application;
  private databaseService!: DatabaseService;
  private cacheService!: CacheService;
  private providerService!: ProviderService;
  private plansService!: PlansService;

  constructor() {
    this.app = express();
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeServices(): void {
    this.databaseService = new DatabaseService();
    this.cacheService = new CacheService();
    this.providerService = new ProviderService();
    this.plansService = new PlansService(
      this.databaseService,
      this.cacheService,
      this.providerService
    );
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Compression for better performance
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        error: 'Too Many Requests',
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      });

      next();
    });
  }

  private initializeRoutes(): void {
    // API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Fever Plans API Documentation',
    }));

    // Initialize controllers
    const searchController = new SearchController(this.plansService);
    const adminController = new AdminController(
      this.plansService,
      this.databaseService,
      this.cacheService,
      this.providerService
    );

    // Setup routes
    const routes = createRoutes(searchController, adminController);
    this.app.use('/', routes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        service: 'Fever Plans Microservice',
        version: '1.0.0',
        description: 'High-performance event plans search and management API',
        documentation: '/api-docs',
        health: '/health',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', ErrorHandler.notFound);

    // Global error handler
    this.app.use(ErrorHandler.handle);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Fever Plans application...');

      // Initialize database
      await this.databaseService.initialize();
      logger.info('Database service initialized');

      // Initialize cache (non-blocking)
      await this.cacheService.initialize();
      logger.info('Cache service initialized');

      // Start background sync
      this.plansService.startPeriodicSync();
      logger.info('Background sync started');

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Application initialization failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down application...');

      // Stop background sync
      this.plansService.stopPeriodicSync();
      logger.info('Background sync stopped');

      // Close database connections
      await this.databaseService.close();
      logger.info('Database connections closed');

      // Close cache connections
      await this.cacheService.close();
      logger.info('Cache connections closed');

      logger.info('Application shutdown completed');
    } catch (error) {
      logger.error('Error during application shutdown:', error);
      throw error;
    }
  }

  getApp(): express.Application {
    return this.app;
  }

  // For testing purposes
  getServices() {
    return {
      database: this.databaseService,
      cache: this.cacheService,
      provider: this.providerService,
      plans: this.plansService,
    };
  }
}