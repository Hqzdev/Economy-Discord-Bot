import db from '../database/client.js';
import logger from '../utils/logger.js';
import { UserService } from './userService.js';

export class ListingService {
  constructor() {
    this.userService = new UserService();
  }

  async createListing(sellerId, itemName, price, quantity) {
    try {
      // Validate inputs
      if (price <= 0) {
        throw new Error('Price must be positive');
      }
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error('Quantity must be a positive integer');
      }

      // Check stock availability
      const stock = await this.userService.getStock(sellerId, itemName);
      if (!stock || stock.quantityTotal < quantity) {
        throw new Error('Insufficient stock');
      }

      // Use transaction to ensure consistency
      return await db.transaction(async (prisma) => {
        // Create the listing
        const listing = await prisma.listing.create({
          data: {
            sellerId,
            itemName,
            price,
            quantityAvailable: quantity,
            status: 'ACTIVE',
          },
        });

        // Decrease stock
        await prisma.stock.update({
          where: {
            userId_itemName: {
              userId: sellerId,
              itemName,
            },
          },
          data: {
            quantityTotal: {
              decrement: quantity,
            },
          },
        });

        logger.info(`Created listing ${listing.id} for ${itemName} by user ${sellerId}`);
        return listing;
      });
    } catch (error) {
      logger.error('Error creating listing:', error);
      throw error;
    }
  }

  async getActiveListings(searchTerm = '', page = 1, limit = 10) {
    try {
      const where = {
        status: 'ACTIVE',
      };

      if (searchTerm) {
        where.itemName = {
          contains: searchTerm,
          mode: 'insensitive',
        };
      }

      const [listings, total] = await Promise.all([
        db.client.listing.findMany({
          where,
          include: {
            seller: true,
          },
          orderBy: {
            itemName: 'asc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.client.listing.count({ where }),
      ]);

      return {
        listings,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error getting active listings:', error);
      throw error;
    }
  }

  async getListingById(listingId) {
    try {
      return await db.client.listing.findUnique({
        where: { id: listingId },
        include: {
          seller: true,
        },
      });
    } catch (error) {
      logger.error('Error getting listing by ID:', error);
      throw error;
    }
  }

  async updateListingQuantity(listingId, newQuantity) {
    try {
      if (newQuantity <= 0) {
        // Close the listing if quantity becomes 0 or negative
        return await this.closeListing(listingId);
      }

      return await db.client.listing.update({
        where: { id: listingId },
        data: {
          quantityAvailable: newQuantity,
        },
      });
    } catch (error) {
      logger.error('Error updating listing quantity:', error);
      throw error;
    }
  }

  async closeListing(listingId) {
    try {
      const listing = await db.client.listing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Return remaining stock to seller
      await db.transaction(async (prisma) => {
        await prisma.listing.update({
          where: { id: listingId },
          data: { status: 'CLOSED' },
        });

        if (listing.quantityAvailable > 0) {
          const existingStock = await this.userService.getStock(listing.sellerId, listing.itemName);
          if (existingStock) {
            await prisma.stock.update({
              where: {
                userId_itemName: {
                  userId: listing.sellerId,
                  itemName: listing.itemName,
                },
              },
              data: {
                quantityTotal: {
                  increment: listing.quantityAvailable,
                },
              },
            });
          } else {
            await prisma.stock.create({
              data: {
                userId: listing.sellerId,
                itemName: listing.itemName,
                quantityTotal: listing.quantityAvailable,
              },
            });
          }
        }
      });

      logger.info(`Closed listing ${listingId}`);
    } catch (error) {
      logger.error('Error closing listing:', error);
      throw error;
    }
  }

  async getUserActiveListings(userId) {
    try {
      return await db.client.listing.findMany({
        where: {
          sellerId: userId,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      logger.error('Error getting user active listings:', error);
      throw error;
    }
  }

  async getListingStats() {
    try {
      const [activeCount, totalCount] = await Promise.all([
        db.client.listing.count({
          where: { status: 'ACTIVE' },
        }),
        db.client.listing.count(),
      ]);

      return {
        active: activeCount,
        total: totalCount,
      };
    } catch (error) {
      logger.error('Error getting listing stats:', error);
      throw error;
    }
  }
}
