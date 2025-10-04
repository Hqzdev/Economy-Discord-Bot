import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';

export class UserService {
  async getOrCreateUser(discordId) {
    try {
      let user = db.getUserByDiscordId(discordId);

      if (!user) {
        user = db.createUser(discordId, 0);
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
      return await db.client.user.findUnique({
        where: { discordId },
        include: {
          stocks: true,
        },
      });
    } catch (error) {
      logger.error('Error getting user by discord ID:', error);
      throw error;
    }
  }

  async updateBalance(userId, newBalance) {
    try {
      return await db.client.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });
    } catch (error) {
      logger.error('Error updating balance:', error);
      throw error;
    }
  }

  async addBalance(userId, amount) {
    try {
      return await db.client.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
    } catch (error) {
      logger.error('Error adding balance:', error);
      throw error;
    }
  }

  async getStock(userId, itemName) {
    try {
      return await db.client.stock.findUnique({
        where: {
          userId_itemName: {
            userId,
            itemName,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting stock:', error);
      throw error;
    }
  }

  async updateStock(userId, itemName, quantity) {
    try {
      const existingStock = await this.getStock(userId, itemName);
      
      if (existingStock) {
        return await db.client.stock.update({
          where: {
            userId_itemName: {
              userId,
              itemName,
            },
          },
          data: {
            quantityTotal: quantity,
          },
        });
      } else {
        return await db.client.stock.create({
          data: {
            userId,
            itemName,
            quantityTotal: quantity,
          },
        });
      }
    } catch (error) {
      logger.error('Error updating stock:', error);
      throw error;
    }
  }

  async decreaseStock(userId, itemName, quantity) {
    try {
      const stock = await this.getStock(userId, itemName);
      
      if (!stock || stock.quantityTotal < quantity) {
        throw new Error('Insufficient stock');
      }

      return await db.client.stock.update({
        where: {
          userId_itemName: {
            userId,
            itemName,
          },
        },
        data: {
          quantityTotal: {
            decrement: quantity,
          },
        },
      });
    } catch (error) {
      logger.error('Error decreasing stock:', error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const user = await db.client.user.findUnique({
        where: { id: userId },
        include: {
          listings: {
            where: { status: 'ACTIVE' },
          },
          dealsAsBuyer: {
            where: { status: 'PENDING' },
          },
          dealsAsSeller: {
            where: { status: 'PENDING' },
          },
          stocks: true,
        },
      });

      return {
        balance: user.balance,
        activeListings: user.listings.length,
        activeDealsAsBuyer: user.dealsAsBuyer.length,
        activeDealsAsSeller: user.dealsAsSeller.length,
        totalItems: user.stocks.length,
        totalStockQuantity: user.stocks.reduce((sum, stock) => sum + stock.quantityTotal, 0),
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}
