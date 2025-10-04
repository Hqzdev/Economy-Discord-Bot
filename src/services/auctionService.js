import db from '../database/client.js';
import logger from '../utils/logger.js';

export class AuctionService {
  async createAuction(creatorId, itemName, startTime, description = null) {
    try {
      // Validate start time
      const startDate = new Date(startTime);
      if (startDate <= new Date()) {
        throw new Error('Start time must be in the future');
      }

      const auction = await db.client.auction.create({
        data: {
          creatorId,
          itemName,
          startTime: startDate,
          description,
          status: 'SCHEDULED',
        },
        include: {
          creator: true,
        },
      });

      logger.info(`Created auction ${auction.id} for ${itemName} by user ${creatorId}`);
      return auction;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  }

  async getActiveAuctions() {
    try {
      return await db.client.auction.findMany({
        where: {
          status: 'SCHEDULED',
          startTime: {
            gte: new Date(),
          },
        },
        include: {
          creator: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      });
    } catch (error) {
      logger.error('Error getting active auctions:', error);
      throw error;
    }
  }

  async getAuctionById(auctionId) {
    try {
      return await db.client.auction.findUnique({
        where: { id: auctionId },
        include: {
          creator: true,
        },
      });
    } catch (error) {
      logger.error('Error getting auction by ID:', error);
      throw error;
    }
  }

  async closeAuction(auctionId) {
    try {
      const auction = await db.client.auction.update({
        where: { id: auctionId },
        data: { status: 'CLOSED' },
      });

      logger.info(`Closed auction ${auctionId}`);
      return auction;
    } catch (error) {
      logger.error('Error closing auction:', error);
      throw error;
    }
  }

  async getAuctionStats() {
    try {
      const [scheduledCount, closedCount] = await Promise.all([
        db.client.auction.count({ where: { status: 'SCHEDULED' } }),
        db.client.auction.count({ where: { status: 'CLOSED' } }),
      ]);

      return {
        scheduled: scheduledCount,
        closed: closedCount,
        total: scheduledCount + closedCount,
      };
    } catch (error) {
      logger.error('Error getting auction stats:', error);
      throw error;
    }
  }
}
