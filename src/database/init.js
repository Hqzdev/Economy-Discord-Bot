import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Create tables using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        discordId TEXT UNIQUE NOT NULL,
        balance INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS stocks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        quantityTotal INTEGER NOT NULL,
        UNIQUE(userId, itemName),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        sellerId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantityAvailable INTEGER NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        listingId TEXT NOT NULL,
        buyerId TEXT NOT NULL,
        sellerId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        threadId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS auctions (
        id TEXT PRIMARY KEY,
        creatorId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        startTime DATETIME NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'SCHEDULED',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creatorId) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actorId TEXT NOT NULL,
        action TEXT NOT NULL,
        payloadJson TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_listings_item_status ON listings(itemName, status);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_deals_buyer_status ON deals(buyerId, status);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_deals_seller_status ON deals(sellerId, status);`;

    console.log('✅ Database initialized successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}

export { initDatabase };
