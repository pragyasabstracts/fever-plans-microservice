import { Router } from 'express';
import { query } from 'express-validator';
import { SearchController } from '../controllers/SearchController';
import { AdminController } from '../controllers/AdminController';
import { ErrorHandler } from '../middleware/ErrorHandler';

export function createRoutes(
  searchController: SearchController,
  adminController: AdminController
): Router {
  const router = Router();

  // Search validation middleware
  const searchValidation = [
    query('starts_at')
      .notEmpty()
      .withMessage('starts_at is required')
      .isISO8601()
      .withMessage('starts_at must be a valid ISO8601 datetime')
      .custom((value) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('starts_at must be a valid date');
        }
        return true;
      }),
    
    query('ends_at')
      .notEmpty()
      .withMessage('ends_at is required')
      .isISO8601()
      .withMessage('ends_at must be a valid ISO8601 datetime')
      .custom((value, { req }) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('ends_at must be a valid date');
        }

        // Check if ends_at is after starts_at
        if (req.query?.starts_at) {
          const startDate = new Date(req.query.starts_at as string);
          if (date <= startDate) {
            throw new Error('ends_at must be after starts_at');
          }
        }

        return true;
      }),
  ];

  // Main search endpoint
  router.get(
    '/search',
    searchValidation,
    ErrorHandler.asyncWrapper(searchController.search.bind(searchController))
  );

  // Health check endpoint
  router.get(
    '/health',
    ErrorHandler.asyncWrapper(searchController.healthCheck.bind(searchController))
  );

  // Admin endpoints
  router.get(
    '/admin/stats',
    ErrorHandler.asyncWrapper(adminController.getStats.bind(adminController))
  );

  router.post(
    '/admin/sync',
    ErrorHandler.asyncWrapper(adminController.triggerSync.bind(adminController))
  );

  router.get(
    '/admin/health',
    ErrorHandler.asyncWrapper(adminController.getDetailedHealth.bind(adminController))
  );

  router.delete(
    '/admin/cache',
    ErrorHandler.asyncWrapper(adminController.clearCache.bind(adminController))
  );

  router.get(
    '/admin/config',
    ErrorHandler.asyncWrapper(adminController.getConfig.bind(adminController))
  );

  return router;
}