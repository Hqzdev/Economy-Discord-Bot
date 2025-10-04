import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ListingService } from '../src/services/listingService.js';
import { UserService } from '../src/services/userService.js';

// Mock Prisma client
jest.mock('@prisma/client');

describe('ListingService', () => {
  let listingService;
  let userService;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      listing: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      stock: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    // Mock the database client
    jest.doMock('../src/database/client.js', () => ({
      client: mockPrisma,
      transaction: jest.fn((callback) => callback(mockPrisma)),
    }));

    listingService = new ListingService();
    userService = new UserService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    test('should create listing with valid inputs', async () => {
      const sellerId = 'user123';
      const itemName = 'Test Item';
      const price = 100;
      const quantity = 5;

      // Mock stock availability
      mockPrisma.stock.findUnique.mockResolvedValue({
        userId: sellerId,
        itemName,
        quantityTotal: 10,
      });

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.listing.create.mockResolvedValue({
        id: 'listing123',
        sellerId,
        itemName,
        price,
        quantityAvailable: quantity,
        status: 'ACTIVE',
      });

      mockPrisma.stock.update.mockResolvedValue({});

      const result = await listingService.createListing(sellerId, itemName, price, quantity);

      expect(result).toBeDefined();
      expect(result.itemName).toBe(itemName);
      expect(result.price).toBe(price);
      expect(result.quantityAvailable).toBe(quantity);
    });

    test('should throw error for negative price', async () => {
      const sellerId = 'user123';
      const itemName = 'Test Item';
      const price = -10;
      const quantity = 5;

      await expect(
        listingService.createListing(sellerId, itemName, price, quantity)
      ).rejects.toThrow('Price must be positive');
    });

    test('should throw error for zero quantity', async () => {
      const sellerId = 'user123';
      const itemName = 'Test Item';
      const price = 100;
      const quantity = 0;

      await expect(
        listingService.createListing(sellerId, itemName, price, quantity)
      ).rejects.toThrow('Quantity must be a positive integer');
    });

    test('should throw error for non-integer quantity', async () => {
      const sellerId = 'user123';
      const itemName = 'Test Item';
      const price = 100;
      const quantity = 5.5;

      await expect(
        listingService.createListing(sellerId, itemName, price, quantity)
      ).rejects.toThrow('Quantity must be a positive integer');
    });

    test('should throw error for insufficient stock', async () => {
      const sellerId = 'user123';
      const itemName = 'Test Item';
      const price = 100;
      const quantity = 5;

      // Mock insufficient stock
      mockPrisma.stock.findUnique.mockResolvedValue({
        userId: sellerId,
        itemName,
        quantityTotal: 3, // Less than requested quantity
      });

      await expect(
        listingService.createListing(sellerId, itemName, price, quantity)
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('getActiveListings', () => {
    test('should return active listings with pagination', async () => {
      const mockListings = [
        {
          id: 'listing1',
          itemName: 'Item A',
          price: 100,
          quantityAvailable: 5,
          seller: { discordId: 'seller1' },
        },
        {
          id: 'listing2',
          itemName: 'Item B',
          price: 200,
          quantityAvailable: 3,
          seller: { discordId: 'seller2' },
        },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);
      mockPrisma.listing.count.mockResolvedValue(2);

      const result = await listingService.getActiveListings('', 1, 10);

      expect(result.listings).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    test('should filter by search term', async () => {
      const searchTerm = 'sword';
      const mockListings = [
        {
          id: 'listing1',
          itemName: 'Iron Sword',
          price: 100,
          quantityAvailable: 5,
          seller: { discordId: 'seller1' },
        },
      ];

      mockPrisma.listing.findMany.mockResolvedValue(mockListings);
      mockPrisma.listing.count.mockResolvedValue(1);

      await listingService.getActiveListings(searchTerm, 1, 10);

      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itemName: expect.objectContaining({
              contains: searchTerm,
              mode: 'insensitive',
            }),
          }),
        })
      );
    });
  });

  describe('updateListingQuantity', () => {
    test('should update quantity when positive', async () => {
      const listingId = 'listing123';
      const newQuantity = 3;

      mockPrisma.listing.update.mockResolvedValue({
        id: listingId,
        quantityAvailable: newQuantity,
      });

      const result = await listingService.updateListingQuantity(listingId, newQuantity);

      expect(result).toBeDefined();
      expect(mockPrisma.listing.update).toHaveBeenCalledWith({
        where: { id: listingId },
        data: { quantityAvailable: newQuantity },
      });
    });

    test('should close listing when quantity is zero or negative', async () => {
      const listingId = 'listing123';
      const newQuantity = 0;

      // Mock the closeListing method
      jest.spyOn(listingService, 'closeListing').mockResolvedValue();

      await listingService.updateListingQuantity(listingId, newQuantity);

      expect(listingService.closeListing).toHaveBeenCalledWith(listingId);
    });
  });
});
