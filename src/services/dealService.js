import db from '../database/client.js';
import logger from '../utils/logger.js';
import { UserService } from './userService.js';
import { ListingService } from './listingService.js';
import { config } from '../config/index.js';

export class DealService {
  constructor() {
    this.userService = new UserService();
    this.listingService = new ListingService();
  }

  async createDeal(listingId, buyerId, quantity, threadId = null) {
    try {
      // Validate inputs
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error('Quantity must be a positive integer');
      }

      // Get listing with seller info
      const listing = await this.listingService.getListingById(listingId);
      if (!listing || listing.status !== 'ACTIVE') {
        throw new Error('Listing not found or not active');
      }

      if (listing.quantityAvailable < quantity) {
        throw new Error(`Insufficient quantity. Available: ${listing.quantityAvailable}`);
      }

      if (listing.sellerId === buyerId) {
        throw new Error('Cannot buy from yourself');
      }

      // Check if buyer has active deals limit
      const buyerActiveDeals = await db.client.deal.count({
        where: {
          buyerId,
          status: 'PENDING',
        },
      });

      if (buyerActiveDeals >= config.bot.maxActiveDealsPerUser) {
        throw new Error('Maximum active deals limit reached');
      }

      // Use transaction to ensure consistency
      return await db.transaction(async (prisma) => {
        // Create the deal
        const deal = await prisma.deal.create({
          data: {
            listingId,
            buyerId,
            sellerId: listing.sellerId,
            itemName: listing.itemName,
            price: listing.price,
            quantity,
            status: 'PENDING',
            threadId,
          },
          include: {
            buyer: true,
            seller: true,
            listing: true,
          },
        });

        logger.info(`Created deal ${deal.id} for ${quantity} ${listing.itemName} between ${buyerId} and ${listing.sellerId}`);
        return deal;
      });
    } catch (error) {
      logger.error('Error creating deal:', error);
      throw error;
    }
  }

  async confirmDeal(dealId, userId) {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      if (deal.buyerId !== userId) {
        throw new Error('Only buyer can confirm the deal');
      }

      if (deal.status !== 'PENDING') {
        throw new Error('Deal is not pending');
      }

      // Check if listing still has enough quantity
      const listing = await this.listingService.getListingById(deal.listingId);
      if (!listing || listing.quantityAvailable < deal.quantity) {
        throw new Error('Insufficient quantity in listing');
      }

      // Use transaction to ensure consistency
      return await db.transaction(async (prisma) => {
        // Update deal status
        const updatedDeal = await prisma.deal.update({
          where: { id: dealId },
          data: { status: 'COMPLETED' },
          include: {
            buyer: true,
            seller: true,
          },
        });

        // Update listing quantity
        const newQuantity = listing.quantityAvailable - deal.quantity;
        await this.listingService.updateListingQuantity(deal.listingId, newQuantity);

        // Transfer money to seller
        await this.userService.addBalance(deal.sellerId, deal.price * deal.quantity);

        logger.info(`Deal ${dealId} completed. ${deal.quantity} ${deal.itemName} sold for ${deal.price * deal.quantity} coins`);
        return updatedDeal;
      });
    } catch (error) {
      logger.error('Error confirming deal:', error);
      throw error;
    }
  }

  async cancelDeal(dealId, userId) {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      if (deal.buyerId !== userId && deal.sellerId !== userId) {
        throw new Error('Only buyer or seller can cancel the deal');
      }

      if (deal.status !== 'PENDING') {
        throw new Error('Deal is not pending');
      }

      await db.client.deal.update({
        where: { id: dealId },
        data: { status: 'CANCELLED' },
      });

      logger.info(`Deal ${dealId} cancelled by user ${userId}`);
    } catch (error) {
      logger.error('Error cancelling deal:', error);
      throw error;
    }
  }

  async getDealById(dealId) {
    try {
      return await db.client.deal.findUnique({
        where: { id: dealId },
        include: {
          buyer: true,
          seller: true,
          listing: true,
        },
      });
    } catch (error) {
      logger.error('Error getting deal by ID:', error);
      throw error;
    }
  }

  async getUserDeals(userId, status = null, page = 1, limit = 10) {
    try {
      const where = {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      };

      if (status) {
        where.status = status;
      }

      const [deals, total] = await Promise.all([
        db.client.deal.findMany({
          where,
          include: {
            buyer: true,
            seller: true,
            listing: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.client.deal.count({ where }),
      ]);

      return {
        deals,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error getting user deals:', error);
      throw error;
    }
  }

  async getUserActiveDeals(userId) {
    try {
      return await db.client.deal.findMany({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
          ],
          status: 'PENDING',
        },
        include: {
          buyer: true,
          seller: true,
          listing: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      logger.error('Error getting user active deals:', error);
      throw error;
    }
  }

  async getUserDealHistory(userId, page = 1, limit = 10) {
    try {
      return await this.getUserDeals(userId, 'COMPLETED', page, limit);
    } catch (error) {
      logger.error('Error getting user deal history:', error);
      throw error;
    }
  }

  async updateDealQuantity(dealId, newQuantity, userId) {
    try {
      if (newQuantity <= 0 || !Number.isInteger(newQuantity)) {
        throw new Error('Quantity must be a positive integer');
      }

      const deal = await this.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      if (deal.buyerId !== userId) {
        throw new Error('Only buyer can change the quantity');
      }

      if (deal.status !== 'PENDING') {
        throw new Error('Deal is not pending');
      }

      // Check if listing has enough quantity
      const listing = await this.listingService.getListingById(deal.listingId);
      if (!listing || listing.quantityAvailable < newQuantity) {
        throw new Error(`Insufficient quantity in listing. Available: ${listing.quantityAvailable}`);
      }

      await db.client.deal.update({
        where: { id: dealId },
        data: { quantity: newQuantity },
      });

      logger.info(`Deal ${dealId} quantity updated to ${newQuantity}`);
    } catch (error) {
      logger.error('Error updating deal quantity:', error);
      throw error;
    }
  }

  async cleanupExpiredDeals() {
    try {
      const timeoutDate = new Date(Date.now() - config.bot.dealTimeoutHours * 60 * 60 * 1000);
      
      const expiredDeals = await db.client.deal.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: timeoutDate,
          },
        },
      });

      for (const deal of expiredDeals) {
        await this.cancelDeal(deal.id, 'SYSTEM');
        logger.info(`Automatically cancelled expired deal ${deal.id}`);
      }

      return expiredDeals.length;
    } catch (error) {
      logger.error('Error cleaning up expired deals:', error);
      throw error;
    }
  }

  async getDealStats() {
    try {
      const [pendingCount, completedCount, cancelledCount] = await Promise.all([
        db.client.deal.count({ where: { status: 'PENDING' } }),
        db.client.deal.count({ where: { status: 'COMPLETED' } }),
        db.client.deal.count({ where: { status: 'CANCELLED' } }),
      ]);

      return {
        pending: pendingCount,
        completed: completedCount,
        cancelled: cancelledCount,
        total: pendingCount + completedCount + cancelledCount,
      };
    } catch (error) {
      logger.error('Error getting deal stats:', error);
      throw error;
    }
  }
}
