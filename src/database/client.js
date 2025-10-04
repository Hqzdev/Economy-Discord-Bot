import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

class DatabaseClient {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log database queries in development
    this.prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Query: ' + e.query);
        logger.debug('Params: ' + e.params);
        logger.debug('Duration: ' + e.duration + 'ms');
      }
    });

    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e);
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async transaction(callback) {
    return await this.prisma.$transaction(callback);
  }

  get client() {
    return this.prisma;
  }
}

// Singleton instance
const db = new DatabaseClient();

export default db;
