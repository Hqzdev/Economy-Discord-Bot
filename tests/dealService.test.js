import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { DealService } from '../src/services/dealService.js';
import { UserService } from '../src/services/userService.js';
import { ListingService } from '../src/services/listingService.js';

// Mock dependencies
jest.mock('../src/services/userService.js');
jest.mock('../src/services/listingService.js');
jest.mock('../src/database/client.js');

describe('DealService', () => {
  let dealService;
  let mockUserService;
  let mockListingService;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      deal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    // Mock the database client
    jest.doMock('../src/database/client.js', () => ({
      client: mockPrisma,
      transaction: jest.fn((callback) => callback(mockPrisma)),
    }));

    mockUserService = {
      addBalance: jest.fn(),
    };

    mockListingService = {
      getListingById: jest.fn(),
      updateListingQuantity: jest.fn(),
    };

    UserService.mockImplementation(() => mockUserService);
    ListingService.mockImplementation(() => mockListingService);

    dealService = new DealService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDeal', () => {
    test('should create deal with valid inputs', async () => {
      const listingId = 'listing123';
      const buyerId = 'buyer123';
      const quantity = 2;
      const threadId = 'thread123';

      const mockListing = {
        id: listingId,
        sellerId: 'seller123',
        itemName: 'Test Item',
        price: 100,
        quantityAvailable: 5,
        status: 'ACTIVE',
      };

      mockListingService.getListingById.mockResolvedValue(mockListing);
      mockPrisma.deal.count.mockResolvedValue(0); // No existing active deals
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      const mockDeal = {
        id: 'deal123',
        listingId,
        buyerId,
        sellerId: 'seller123',
        itemName: 'Test Item',
        price: 100,
        quantity,
        status: 'PENDING',
        threadId,
        buyer: { discordId: buyerId },
        seller: { discordId: 'seller123' },
        listing: mockListing,
      };

      mockPrisma.deal.create.mockResolvedValue(mockDeal);

      const result = await dealService.createDeal(listingId, buyerId, quantity, threadId);

      expect(result).toBeDefined();
      expect(result.id).toBe('deal123');
      expect(result.buyerId).toBe(buyerId);
      expect(result.quantity).toBe(quantity);
    });

    test('should throw error for invalid quantity', async () => {
      const listingId = 'listing123';
      const buyerId = 'buyer123';
      const quantity = -1;

      await expect(
        dealService.createDeal(listingId, buyerId, quantity)
      ).rejects.toThrow('Quantity must be a positive integer');
    });

    test('should throw error for inactive listing', async () => {
      const listingId = 'listing123';
      const buyerId = 'buyer123';
      const quantity = 2;

      const mockListing = {
        id: listingId,
        status: 'CLOSED',
      };

      mockListingService.getListingById.mockResolvedValue(mockListing);

      await expect(
        dealService.createDeal(listingId, buyerId, quantity)
      ).rejects.toThrow('Listing not found or not active');
    });

    test('should throw error for insufficient quantity in listing', async () => {
      const listingId = 'listing123';
      const buyerId = 'buyer123';
      const quantity = 10;

      const mockListing = {
        id: listingId,
        sellerId: 'seller123',
        itemName: 'Test Item',
        price: 100,
        quantityAvailable: 5, // Less than requested
        status: 'ACTIVE',
      };

      mockListingService.getListingById.mockResolvedValue(mockListing);

      await expect(
        dealService.createDeal(listingId, buyerId, quantity)
      ).rejects.toThrow('Insufficient quantity');
    });

    test('should throw error when buying from self', async () => {
      const listingId = 'listing123';
      const buyerId = 'buyer123';
      const quantity = 2;

      const mockListing = {
        id: listingId,
        sellerId: buyerId, // Same as buyer
        itemName: 'Test Item',
        price: 100,
        quantityAvailable: 5,
        status: 'ACTIVE',
      };

      mockListingService.getListingById.mockResolvedValue(mockListing);

      await expect(
        dealService.createDeal(listingId, buyerId, quantity)
      ).rejects.toThrow('Cannot buy from yourself');
    });
  });

  describe('confirmDeal', () => {
    test('should confirm deal successfully', async () => {
      const dealId = 'deal123';
      const userId = 'buyer123';

      const mockDeal = {
        id: dealId,
        buyerId: userId,
        sellerId: 'seller123',
        itemName: 'Test Item',
        price: 100,
        quantity: 2,
        status: 'PENDING',
        listingId: 'listing123',
        buyer: { discordId: userId },
        seller: { discordId: 'seller123' },
      };

      const mockListing = {
        id: 'listing123',
        quantityAvailable: 5,
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);
      mockListingService.getListingById.mockResolvedValue(mockListing);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      const updatedDeal = { ...mockDeal, status: 'COMPLETED' };
      mockPrisma.deal.update.mockResolvedValue(updatedDeal);
      mockListingService.updateListingQuantity.mockResolvedValue();
      mockUserService.addBalance.mockResolvedValue();

      const result = await dealService.confirmDeal(dealId, userId);

      expect(result.status).toBe('COMPLETED');
      expect(mockUserService.addBalance).toHaveBeenCalledWith('seller123', 200); // 100 * 2
      expect(mockListingService.updateListingQuantity).toHaveBeenCalledWith('listing123', 3); // 5 - 2
    });

    test('should throw error when non-buyer tries to confirm', async () => {
      const dealId = 'deal123';
      const userId = 'seller123'; // Not the buyer

      const mockDeal = {
        id: dealId,
        buyerId: 'buyer123',
        sellerId: userId,
        status: 'PENDING',
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);

      await expect(
        dealService.confirmDeal(dealId, userId)
      ).rejects.toThrow('Only buyer can confirm the deal');
    });

    test('should throw error when deal is not pending', async () => {
      const dealId = 'deal123';
      const userId = 'buyer123';

      const mockDeal = {
        id: dealId,
        buyerId: userId,
        status: 'COMPLETED', // Not pending
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);

      await expect(
        dealService.confirmDeal(dealId, userId)
      ).rejects.toThrow('Deal is not pending');
    });
  });

  describe('cancelDeal', () => {
    test('should cancel deal successfully', async () => {
      const dealId = 'deal123';
      const userId = 'buyer123';

      const mockDeal = {
        id: dealId,
        buyerId: userId,
        sellerId: 'seller123',
        status: 'PENDING',
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrisma.deal.update.mockResolvedValue({});

      await dealService.cancelDeal(dealId, userId);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: dealId },
        data: { status: 'CANCELLED' },
      });
    });

    test('should allow seller to cancel deal', async () => {
      const dealId = 'deal123';
      const userId = 'seller123';

      const mockDeal = {
        id: dealId,
        buyerId: 'buyer123',
        sellerId: userId,
        status: 'PENDING',
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrisma.deal.update.mockResolvedValue({});

      await dealService.cancelDeal(dealId, userId);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: dealId },
        data: { status: 'CANCELLED' },
      });
    });

    test('should throw error when non-participant tries to cancel', async () => {
      const dealId = 'deal123';
      const userId = 'outsider123';

      const mockDeal = {
        id: dealId,
        buyerId: 'buyer123',
        sellerId: 'seller123',
        status: 'PENDING',
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);

      await expect(
        dealService.cancelDeal(dealId, userId)
      ).rejects.toThrow('Only buyer or seller can cancel the deal');
    });
  });

  describe('updateDealQuantity', () => {
    test('should update deal quantity successfully', async () => {
      const dealId = 'deal123';
      const newQuantity = 3;
      const userId = 'buyer123';

      const mockDeal = {
        id: dealId,
        buyerId: userId,
        sellerId: 'seller123',
        status: 'PENDING',
        listingId: 'listing123',
      };

      const mockListing = {
        id: 'listing123',
        quantityAvailable: 5,
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);
      mockListingService.getListingById.mockResolvedValue(mockListing);
      mockPrisma.deal.update.mockResolvedValue({});

      await dealService.updateDealQuantity(dealId, newQuantity, userId);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: dealId },
        data: { quantity: newQuantity },
      });
    });

    test('should throw error when non-buyer tries to change quantity', async () => {
      const dealId = 'deal123';
      const newQuantity = 3;
      const userId = 'seller123';

      const mockDeal = {
        id: dealId,
        buyerId: 'buyer123',
        sellerId: userId,
        status: 'PENDING',
      };

      mockPrisma.deal.findUnique.mockResolvedValue(mockDeal);

      await expect(
        dealService.updateDealQuantity(dealId, newQuantity, userId)
      ).rejects.toThrow('Only buyer can change the quantity');
    });
  });
});
