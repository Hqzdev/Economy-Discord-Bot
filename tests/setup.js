// Jest setup file for Discord Market Bot tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.DISCORD_TOKEN = 'test-token';
process.env.GUILD_ID = 'test-guild-id';
process.env.MARKET_CHANNEL_ID = 'test-channel-id';
process.env.AUCTIONEER_ROLE_ID = 'test-role-id';

// Global test timeout
jest.setTimeout(10000);
