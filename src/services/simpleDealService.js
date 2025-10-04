import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';
import { UserService } from './simpleUserService.js';
import { ListingService } from './simpleListingService.js';
import { config } from '../config/index.js';

export class DealService {
  constructor() {
    this.userService = new UserService();
    this.listingService = new ListingService();
  }

  async createDeal(listingId, buyerDiscordId, quantity, threadId = null) {
    try {
      // Validate inputs
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error('Quantity must be a positive integer');
      }

      // Get listing
      const listing = await this.listingService.getListingById(listingId);
      if (!listing || listing.status !== 'ACTIVE') {
        throw new Error('Listing not found or not active');
      }

      if (listing.quantityAvailable < quantity) {
        throw new Error(`Insufficient quantity. Available: ${listing.quantityAvailable}`);
      }

      // Get or create buyer
      const buyer = await this.userService.getOrCreateUser(buyerDiscordId);
      
      if (listing.sellerId === buyer.id) {
        throw new Error('Cannot buy from yourself');
      }

      // Create the deal
      const deal = db.createDeal(
        listingId,
        buyer.id,
        listing.sellerId,
        listing.itemName,
        listing.price,
        quantity,
        threadId
      );

      logger.info(`Created deal ${deal.id} for ${quantity} ${listing.itemName} between ${buyerDiscordId} and ${listing.sellerId}`);
      return deal;
    } catch (error) {
      logger.error('Error creating deal:', error);
      throw error;
    }
  }

  async confirmDeal(dealId, userDiscordId) {
    try {
      const deal = db.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(userDiscordId);

      if (deal.buyerId !== user.id && deal.sellerId !== user.id) {
        throw new Error('Only buyer or seller can confirm the deal');
      }

      if (deal.status !== 'PENDING') {
        throw new Error('Deal is not pending');
      }

      // Check if user already confirmed
      if ((deal.buyerId === user.id && deal.buyerConfirmed) || 
          (deal.sellerId === user.id && deal.sellerConfirmed)) {
        throw new Error('You have already confirmed this deal');
      }

      // Confirm deal by user
      const updatedDeal = db.confirmDealByUser(dealId, user.id);

      // If both parties confirmed, update listing quantity
      if (updatedDeal.status === 'COMPLETED') {
        const listing = await this.listingService.getListingById(deal.listingId);
        const newQuantity = listing.quantityAvailable - deal.quantity;
        await this.listingService.updateListingQuantity(deal.listingId, newQuantity);
        
        logger.info(`Deal ${dealId} completed by both parties. ${deal.quantity} ${deal.itemName} - transaction to be completed in-game`);
      } else {
        logger.info(`Deal ${dealId} partially confirmed by user ${userDiscordId}`);
      }

      return updatedDeal;
    } catch (error) {
      logger.error('Error confirming deal:', error);
      throw error;
    }
  }

  async cancelDeal(dealId, userDiscordId) {
    try {
      const deal = db.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(userDiscordId);

      if (deal.buyerId !== user.id && deal.sellerId !== user.id) {
        throw new Error('Only buyer or seller can cancel the deal');
      }

      if (deal.status !== 'PENDING') {
        throw new Error('Deal is not pending');
      }

      db.updateDealStatus(dealId, 'CANCELLED');
      logger.info(`Deal ${dealId} cancelled by user ${userDiscordId}`);
      
      // Return the updated deal
      return db.getDealById(dealId);
    } catch (error) {
      logger.error('Error cancelling deal:', error);
      throw error;
    }
  }

  async closeDeal(dealId, userDiscordId) {
    try {
      const deal = db.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(userDiscordId);

      if (deal.buyerId !== user.id && deal.sellerId !== user.id) {
        throw new Error('Only buyer or seller can close the deal');
      }

      // Allow closing deals in any status (PENDING, COMPLETED, CANCELLED)
      db.updateDealStatus(dealId, 'CLOSED');
      logger.info(`Deal ${dealId} closed by user ${userDiscordId}`);
      
      // Return the updated deal
      return db.getDealById(dealId);
    } catch (error) {
      logger.error('Error closing deal:', error);
      throw error;
    }
  }

  async getDealById(dealId) {
    try {
      return db.getDealById(dealId);
    } catch (error) {
      logger.error('Error getting deal by ID:', error);
      throw error;
    }
  }

  async getUserDeals(userId, status = null, page = 1, limit = 10) {
    try {
      const deals = db.getUserDealHistory(userId, status);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDeals = deals.slice(startIndex, endIndex);

      return {
        deals: paginatedDeals,
        total: deals.length,
        page,
        totalPages: Math.ceil(deals.length / limit),
        hasNext: endIndex < deals.length,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error getting user deals:', error);
      throw error;
    }
  }

  async getUserActiveDeals(userDiscordId) {
    try {
      const user = await this.userService.getOrCreateUser(userDiscordId);
      return db.getUserActiveDeals(user.id);
    } catch (error) {
      logger.error('Error getting user active deals:', error);
      throw error;
    }
  }

  async getUserDealHistory(userDiscordId, page = 1, limit = 10) {
    try {
      const user = await this.userService.getOrCreateUser(userDiscordId);
      return this.getUserDeals(user.id, 'COMPLETED', page, limit);
    } catch (error) {
      logger.error('Error getting user deal history:', error);
      throw error;
    }
  }

  async updateDealQuantity(dealId, newQuantity, userDiscordId) {
    try {
      if (newQuantity <= 0 || !Number.isInteger(newQuantity)) {
        throw new Error('Quantity must be a positive integer');
      }

      const deal = db.getDealById(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(userDiscordId);

      if (deal.buyerId !== user.id) {
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

      db.updateDealQuantity(dealId, newQuantity);
      logger.info(`Deal ${dealId} quantity updated to ${newQuantity}`);
    } catch (error) {
      logger.error('Error updating deal quantity:', error);
      throw error;
    }
  }

  async cleanupExpiredDeals() {
    try {
      // Simple cleanup - in real implementation, you would check timestamps
      return 0; // No expired deals for now
    } catch (error) {
      logger.error('Error cleaning up expired deals:', error);
      throw error;
    }
  }

  async getDealStats() {
    try {
      const allDeals = db.getUserDealHistory('all'); // Get all deals
      const pendingCount = allDeals.filter(d => d.status === 'PENDING').length;
      const completedCount = allDeals.filter(d => d.status === 'COMPLETED').length;
      const cancelledCount = allDeals.filter(d => d.status === 'CANCELLED').length;

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
