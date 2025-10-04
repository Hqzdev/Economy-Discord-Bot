import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JsonDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/market.json');
    this.data = {
      users: new Map(),
      stocks: new Map(),
      listings: new Map(),
      deals: new Map(),
      auctions: new Map(),
      bids: new Map(),
      auditLog: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        const rawData = JSON.parse(fileContent);
        
        // Convert arrays back to Maps
        this.data.users = new Map(rawData.users || []);
        this.data.stocks = new Map(rawData.stocks || []);
        this.data.listings = new Map(rawData.listings || []);
        this.data.deals = new Map(rawData.deals || []);
        this.data.auctions = new Map(rawData.auctions || []);
        this.data.bids = new Map(rawData.bids || []);
        this.data.auditLog = rawData.auditLog || [];
      }
    } catch (error) {
      console.error('Error loading database:', error);
      this.save();
    }
  }

  save() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const dataToSave = {
        users: Array.from(this.data.users.entries()),
        stocks: Array.from(this.data.stocks.entries()),
        listings: Array.from(this.data.listings.entries()),
        deals: Array.from(this.data.deals.entries()),
        auctions: Array.from(this.data.auctions.entries()),
        bids: Array.from(this.data.bids.entries()),
        auditLog: this.data.auditLog
      };

      fs.writeFileSync(this.dbPath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // User operations
  createUser(discordId) {
    const user = {
      id: this.generateId(),
      discordId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.users.set(user.id, user);
    this.save();
    return user;
  }

  getUserByDiscordId(discordId) {
    for (const user of this.data.users.values()) {
      if (user.discordId === discordId) {
        return user;
      }
    }
    return null;
  }

  getUserById(userId) {
    return this.data.users.get(userId) || null;
  }

  // Balance operations removed - handled in-game

  // Stock operations
  getStock(userId, itemName) {
    const key = `${userId}_${itemName}`;
    return this.data.stocks.get(key) || null;
  }

  updateStock(userId, itemName, quantity) {
    const key = `${userId}_${itemName}`;
    const stock = {
      id: this.generateId(),
      userId,
      itemName,
      quantityTotal: quantity
    };
    this.data.stocks.set(key, stock);
    this.save();
    return stock;
  }

  decreaseStock(userId, itemName, quantity) {
    const stock = this.getStock(userId, itemName);
    if (!stock || stock.quantityTotal < quantity) {
      throw new Error('Insufficient stock');
    }
    stock.quantityTotal -= quantity;
    this.save();
    return stock;
  }

  // Listing operations
  createListing(sellerId, itemName, price, quantity) {
    const listing = {
      id: this.generateId(),
      sellerId,
      itemName,
      price,
      quantityAvailable: quantity,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.listings.set(listing.id, listing);
    this.save();
    return {
      ...listing,
      seller: this.data.users.get(sellerId)
    };
  }

  getActiveListings(searchTerm = '') {
    const listings = Array.from(this.data.listings.values())
      .filter(listing => listing.status === 'ACTIVE')
      .filter(listing => !searchTerm || listing.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
    
    return listings.map(listing => {
      // Try to find user by internal ID first, then by Discord ID
      let seller = this.data.users.get(listing.sellerId);
      if (!seller) {
        // If not found by internal ID, try to find by Discord ID
        seller = this.getUserByDiscordId(listing.sellerId);
      }
      
      return {
        ...listing,
        seller
      };
    });
  }

  getListingById(listingId) {
    const listing = this.data.listings.get(listingId);
    if (listing) {
      // Try to find user by internal ID first, then by Discord ID
      let seller = this.data.users.get(listing.sellerId);
      if (!seller) {
        // If not found by internal ID, try to find by Discord ID
        seller = this.getUserByDiscordId(listing.sellerId);
      }
      
      return {
        ...listing,
        seller
      };
    }
    return null;
  }

  updateListingQuantity(listingId, newQuantity) {
    const listing = this.data.listings.get(listingId);
    if (listing) {
      listing.quantityAvailable = newQuantity;
      if (newQuantity <= 0) {
        listing.status = 'CLOSED';
      }
      listing.updatedAt = new Date().toISOString();
      this.save();
      return listing;
    }
    return null;
  }

  // Deal operations
  createDeal(listingId, buyerId, sellerId, itemName, price, quantity, threadId = null) {
    const deal = {
      id: this.generateId(),
      listingId,
      buyerId,
      sellerId,
      itemName,
      price,
      quantity,
      status: 'PENDING',
      buyerConfirmed: false,
      sellerConfirmed: false,
      threadId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.deals.set(deal.id, deal);
    this.save();
    // Try to find users by internal ID first, then by Discord ID
    let buyer = this.data.users.get(buyerId);
    if (!buyer) {
      buyer = this.getUserByDiscordId(buyerId);
    }
    
    let seller = this.data.users.get(sellerId);
    if (!seller) {
      seller = this.getUserByDiscordId(sellerId);
    }
    
    return {
      ...deal,
      buyer,
      seller
    };
  }

  getDealById(dealId) {
    const deal = this.data.deals.get(dealId);
    if (deal) {
      // Try to find users by internal ID first, then by Discord ID
      let buyer = this.data.users.get(deal.buyerId);
      if (!buyer) {
        buyer = this.getUserByDiscordId(deal.buyerId);
      }
      
      let seller = this.data.users.get(deal.sellerId);
      if (!seller) {
        seller = this.getUserByDiscordId(deal.sellerId);
      }
      
      return {
        ...deal,
        buyer,
        seller
      };
    }
    return null;
  }

  updateDealStatus(dealId, status) {
    const deal = this.data.deals.get(dealId);
    if (deal) {
      deal.status = status;
      deal.updatedAt = new Date().toISOString();
      this.save();
      return deal;
    }
    return null;
  }

  confirmDealByUser(dealId, userId) {
    const deal = this.data.deals.get(dealId);
    if (!deal) return null;

    if (deal.buyerId === userId) {
      deal.buyerConfirmed = true;
    } else if (deal.sellerId === userId) {
      deal.sellerConfirmed = true;
    } else {
      return null; // User is not part of this deal
    }

    deal.updatedAt = new Date().toISOString();
    
    // Check if both parties confirmed
    if (deal.buyerConfirmed && deal.sellerConfirmed) {
      deal.status = 'COMPLETED';
    }
    
    this.save();
    return deal;
  }

  updateDealQuantity(dealId, quantity) {
    const deal = this.data.deals.get(dealId);
    if (deal) {
      deal.quantity = quantity;
      deal.updatedAt = new Date().toISOString();
      this.save();
      return deal;
    }
    return null;
  }

  getUserActiveDeals(userId) {
    return Array.from(this.data.deals.values())
      .filter(deal => (deal.buyerId === userId || deal.sellerId === userId) && deal.status === 'PENDING')
      .map(deal => {
        // Try to find users by internal ID first, then by Discord ID
        let buyer = this.data.users.get(deal.buyerId);
        if (!buyer) {
          buyer = this.getUserByDiscordId(deal.buyerId);
        }
        
        let seller = this.data.users.get(deal.sellerId);
        if (!seller) {
          seller = this.getUserByDiscordId(deal.sellerId);
        }
        
        return {
          ...deal,
          buyer,
          seller
        };
      });
  }

  getUserDealHistory(userId, status = null) {
    let deals = Array.from(this.data.deals.values())
      .filter(deal => deal.buyerId === userId || deal.sellerId === userId);
    
    if (status) {
      deals = deals.filter(deal => deal.status === status);
    }
    
    return deals
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(deal => {
        // Try to find users by internal ID first, then by Discord ID
        let buyer = this.data.users.get(deal.buyerId);
        if (!buyer) {
          buyer = this.getUserByDiscordId(deal.buyerId);
        }
        
        let seller = this.data.users.get(deal.sellerId);
        if (!seller) {
          seller = this.getUserByDiscordId(deal.sellerId);
        }
        
        return {
          ...deal,
          buyer,
          seller
        };
      });
  }

  // Auction operations
  createAuction(creatorId, itemName, startTime, endTime, minPrice, description = null) {
    const auction = {
      id: this.generateId(),
      creatorId,
      itemName,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      minPrice,
      description,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.auctions.set(auction.id, auction);
    this.save();
    // Try to find user by internal ID first, then by Discord ID
    let creator = this.data.users.get(creatorId);
    if (!creator) {
      creator = this.getUserByDiscordId(creatorId);
    }
    
    return {
      ...auction,
      creator
    };
  }

  getActiveAuctions() {
    return Array.from(this.data.auctions.values())
      .filter(auction => auction.status === 'ACTIVE' && new Date(auction.endTime) > new Date())
      .sort((a, b) => new Date(a.endTime) - new Date(b.endTime))
      .map(auction => {
        // Try to find user by internal ID first, then by Discord ID
        let creator = this.data.users.get(auction.creatorId);
        if (!creator) {
          creator = this.getUserByDiscordId(auction.creatorId);
        }
        
        return {
          ...auction,
          startTime: new Date(auction.startTime),
          endTime: new Date(auction.endTime),
          creator
        };
      });
  }

  createBid(auctionId, bidderId, amount) {
    // Check if auction exists and is active
    const auction = this.data.auctions.get(auctionId);
    if (!auction) {
      throw new Error('Auction not found');
    }

    if (auction.status !== 'ACTIVE') {
      throw new Error('Auction is not active');
    }

    if (new Date(auction.endTime) <= new Date()) {
      throw new Error('Auction has ended');
    }

    if (amount < auction.minPrice) {
      throw new Error(`Bid must be at least ${auction.minPrice} coins`);
    }

    // Check if user already has a bid for this auction
    const existingBid = Array.from(this.data.bids.values())
      .find(bid => bid.auctionId === auctionId && bid.bidderId === bidderId);

    if (existingBid) {
      throw new Error('You already have a bid for this auction');
    }

    const bid = {
      id: this.generateId(),
      auctionId,
      bidderId,
      amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.bids.set(bid.id, bid);
    this.save();

    // Try to find user by internal ID first, then by Discord ID
    let bidder = this.data.users.get(bidderId);
    if (!bidder) {
      bidder = this.getUserByDiscordId(bidderId);
    }
    
    return {
      ...bid,
      bidder
    };
  }

  getAuctionBids(auctionId) {
    return Array.from(this.data.bids.values())
      .filter(bid => bid.auctionId === auctionId)
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending
      .map(bid => {
        // Try to find user by internal ID first, then by Discord ID
        let bidder = this.data.users.get(bid.bidderId);
        if (!bidder) {
          bidder = this.getUserByDiscordId(bid.bidderId);
        }
        
        return {
          ...bid,
          bidder
        };
      });
  }

  updateAuctionStatus(auctionId, status) {
    const auction = this.data.auctions.get(auctionId);
    if (auction) {
      auction.status = status;
      auction.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  setAuctionWinner(auctionId, winnerId, winningAmount) {
    const auction = this.data.auctions.get(auctionId);
    if (auction) {
      auction.winnerId = winnerId;
      auction.winningAmount = winningAmount;
      auction.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  // Audit operations
  logAction(actorId, action, payload = {}) {
    const logEntry = {
      id: this.generateId(),
      actorId,
      action,
      payloadJson: JSON.stringify(payload),
      createdAt: new Date().toISOString()
    };
    this.data.auditLog.push(logEntry);
    this.save();
  }
}

// Singleton instance
const db = new JsonDatabase();

export default db;
