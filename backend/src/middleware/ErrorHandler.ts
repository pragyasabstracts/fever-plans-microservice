import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ErrorHandler {
  static handle(error: Error, req: Request, res: Response, _next: NextFunction): void {
    logger.error('Unhandled error occurred', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'Something went wrong on our end',
      ...(isDevelopment && { stack: error.stack })
    });
  }

  static notFound(req: Request, res: Response): void {
    res.status(404).json({
      error: 'Not Found',
      message: `The requested resource ${req.originalUrl} was not found`
    });
  }

  static asyncWrapper(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}