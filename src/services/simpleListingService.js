import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';
import { UserService } from './simpleUserService.js';

export class ListingService {
  constructor() {
    this.userService = new UserService();
    this.persistentMarketService = null;
  }

  setPersistentMarketService(service) {
    this.persistentMarketService = service;
  }

  async createListing(sellerDiscordId, itemName, price, quantity, imageUrl = null, category = null) {
    try {
      // Validate inputs
      if (price <= 0) {
        throw new Error('Price must be positive');
      }
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error('Quantity must be a positive integer');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(sellerDiscordId);
      
      const listing = db.createListing(user.id, itemName, price, quantity, imageUrl, category);
      logger.info(`Created listing ${listing.id} for ${itemName} by user ${sellerDiscordId}`);
      
      // Мгновенное обновление рынка
      if (this.persistentMarketService) {
        this.persistentMarketService.delayedUpdate(1000); // Обновление через 1 секунду
      }
      
      return listing;
    } catch (error) {
      logger.error('Error creating listing:', error);
      throw error;
    }
  }

  async getActiveListings(searchTerm = '', page = 1, limit = 10, category = null) {
    try {
      const listings = db.getActiveListings(searchTerm, category);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedListings = listings.slice(startIndex, endIndex);

      return {
        listings: paginatedListings,
        total: listings.length,
        page,
        totalPages: Math.ceil(listings.length / limit),
        hasNext: endIndex < listings.length,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error getting active listings:', error);
      throw error;
    }
  }

  async getListingById(listingId) {
    try {
      return db.getListingById(listingId);
    } catch (error) {
      logger.error('Error getting listing by ID:', error);
      throw error;
    }
  }

  async updateListingQuantity(listingId, newQuantity) {
    try {
      if (newQuantity <= 0) {
        // Close the listing if quantity becomes 0 or negative
        return this.closeListing(listingId);
      }

      const result = db.updateListingQuantity(listingId, newQuantity);
      
      // Мгновенное обновление рынка
      if (this.persistentMarketService) {
        this.persistentMarketService.delayedUpdate(1000);
      }
      
      return result;
    } catch (error) {
      logger.error('Error updating listing quantity:', error);
      throw error;
    }
  }

  async closeListing(listingId) {
    try {
      const listing = db.getListingById(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }

      // For now, just mark as closed
      // In real implementation, you would return stock to seller
      db.updateListingQuantity(listingId, 0);
      logger.info(`Closed listing ${listingId}`);
      
      // Мгновенное обновление рынка
      if (this.persistentMarketService) {
        this.persistentMarketService.delayedUpdate(1000);
      }
    } catch (error) {
      logger.error('Error closing listing:', error);
      throw error;
    }
  }

  async getUserActiveListings(userDiscordId) {
    try {
      const user = await this.userService.getOrCreateUser(userDiscordId);
      return db.getActiveListings().filter(listing => listing.sellerId === user.id);
    } catch (error) {
      logger.error('Error getting user active listings:', error);
      throw error;
    }
  }

  async getListingStats() {
    try {
      const activeCount = db.getActiveListings().length;
      return {
        active: activeCount,
        total: activeCount, // Simplified for now
      };
    } catch (error) {
      logger.error('Error getting listing stats:', error);
      throw error;
    }
  }
}
