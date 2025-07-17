// import { config } from '../config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'fever_plans_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.PORT = '0'; // Use random port for tests

// Mock external dependencies for faster tests
jest.mock('axios');
jest.mock('ioredis');

// Global test setup
beforeAll(async () => {
  // Setup test database if needed
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('Cleaning up test environment...');
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, _promise) => {
  console.error('Unhandled Rejection in tests:', reason);
  throw reason;
});