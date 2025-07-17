import { FeverPlansApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

class Server {
  private app: FeverPlansApp;
  private server: any;

  constructor() {
    this.app = new FeverPlansApp();
  }

  async start(): Promise<void> {
    try {
      // Initialize the application
      await this.app.initialize();

      // Start the HTTP server
      this.server = this.app.getApp().listen(config.server.port, () => {
        logger.info(`🚀 Fever Plans server started successfully`, {
          port: config.server.port,
          environment: config.server.env,
          nodeVersion: process.version,
          pid: process.pid,
        });

        if (config.server.env === 'development') {
          logger.info('📚 API Documentation available at:', {
            url: `http://localhost:${config.server.port}/api-docs`
          });
        }
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    // Handle various shutdown signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        await this.gracefulShutdown();
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.forcefulShutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.forcefulShutdown(1);
    });
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      logger.info('Starting graceful shutdown...');

      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Give existing requests time to complete
      await this.sleep(5000);

      // Shutdown application services
      await this.app.shutdown();

      logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      this.forcefulShutdown(1);
    }
  }

  private forcefulShutdown(exitCode: number): void {
    logger.warn('Forcing shutdown...');
    process.exit(exitCode);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

export { Server };