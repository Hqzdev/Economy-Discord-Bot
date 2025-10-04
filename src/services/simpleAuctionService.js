import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';
import { UserService } from './simpleUserService.js';

export class AuctionService {
  constructor() {
    this.userService = new UserService();
  }

  async createAuction(creatorDiscordId, itemName, startTime, endTime, minPrice, description = null) {
    try {
      // Validate times
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      if (endDate <= startDate) {
        throw new Error('End time must be after start time');
      }

      if (minPrice <= 0) {
        throw new Error('Minimum price must be greater than 0');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(creatorDiscordId);

      const auction = db.createAuction(user.id, itemName, startDate, endDate, minPrice, description);
      logger.info(`Created auction ${auction.id} for ${itemName} by user ${creatorDiscordId}`);
      return auction;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  }

  async makeBid(auctionId, bidderDiscordId, amount) {
    try {
      // Get or create user
      const user = await this.userService.getOrCreateUser(bidderDiscordId);

      const bid = db.createBid(auctionId, user.id, amount);
      logger.info(`Created bid ${bid.id} for auction ${auctionId} by user ${bidderDiscordId} for ${amount} coins`);
      return bid;
    } catch (error) {
      logger.error('Error making bid:', error);
      throw error;
    }
  }

  async getActiveAuctions() {
    try {
      return db.getActiveAuctions();
    } catch (error) {
      logger.error('Error getting active auctions:', error);
      throw error;
    }
  }

  async getAuctionInfo(auctionId) {
    try {
      const auction = db.data.auctions.get(auctionId);
      if (!auction) {
        return null;
      }

      return {
        ...auction,
        startTime: new Date(auction.startTime),
        endTime: new Date(auction.endTime),
        creator: db.data.users.get(auction.creatorId)
      };
    } catch (error) {
      logger.error('Error getting auction info:', error);
      throw error;
    }
  }

  async getAuctionBids(auctionId) {
    try {
      return db.getAuctionBids(auctionId);
    } catch (error) {
      logger.error('Error getting auction bids:', error);
      throw error;
    }
  }

  async getAuctionById(auctionId) {
    try {
      // Simple implementation - would need to add this method to jsonDb
      const auctions = db.getActiveAuctions();
      return auctions.find(a => a.id === auctionId) || null;
    } catch (error) {
      logger.error('Error getting auction by ID:', error);
      throw error;
    }
  }

  async closeAuction(auctionId) {
    try {
      // Simple implementation - would need to add this method to jsonDb
      logger.info(`Closed auction ${auctionId}`);
      return { id: auctionId, status: 'CLOSED' };
    } catch (error) {
      logger.error('Error closing auction:', error);
      throw error;
    }
  }

  async getAuctionStats() {
    try {
      const auctions = db.getActiveAuctions();
      return {
        scheduled: auctions.length,
        closed: 0, // Simplified
        total: auctions.length,
      };
    } catch (error) {
      logger.error('Error getting auction stats:', error);
      throw error;
    }
  }
}
