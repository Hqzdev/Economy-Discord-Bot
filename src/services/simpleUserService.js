import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';

export class UserService {
  async getOrCreateUser(discordId) {
    try {
      let user = db.getUserByDiscordId(discordId);

      if (!user) {
        user = db.createUser(discordId);
        logger.info(`Created new user: ${discordId}`);
      }

      return user;
    } catch (error) {
      logger.error('Error getting or creating user:', error);
      throw error;
    }
  }

  async getUserByDiscordId(discordId) {
    try {
      return db.getUserByDiscordId(discordId);
    } catch (error) {
      logger.error('Error getting user by discord ID:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      return db.getUserById(userId);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getStock(userId, itemName) {
    try {
      return db.getStock(userId, itemName);
    } catch (error) {
      logger.error('Error getting stock:', error);
      throw error;
    }
  }

  async updateStock(userId, itemName, quantity) {
    try {
      return db.updateStock(userId, itemName, quantity);
    } catch (error) {
      logger.error('Error updating stock:', error);
      throw error;
    }
  }

  async decreaseStock(userId, itemName, quantity) {
    try {
      return db.decreaseStock(userId, itemName, quantity);
    } catch (error) {
      logger.error('Error decreasing stock:', error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const user = db.getUserByDiscordId(userId);
      if (!user) return null;

      const activeListings = db.getActiveListings().filter(l => l.sellerId === userId);
      const activeDealsAsBuyer = db.getUserActiveDeals(userId).filter(d => d.buyerId === userId);
      const activeDealsAsSeller = db.getUserActiveDeals(userId).filter(d => d.sellerId === userId);

      return {
        activeListings: activeListings.length,
        activeDealsAsBuyer: activeDealsAsBuyer.length,
        activeDealsAsSeller: activeDealsAsSeller.length,
        totalItems: 0, // Will implement later
        totalStockQuantity: 0, // Will implement later
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}