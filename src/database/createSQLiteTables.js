const { dbHelper } = require('./sqliteConnection');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function createSQLiteTables() {
    try {
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            logger.info('📁 Created data directory');
        }

        logger.info('🗄️ Creating SQLite database tables...');

        // Users table
        await dbHelper.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                display_name TEXT,
                balance REAL DEFAULT 0,
                total_sales REAL DEFAULT 0,
                total_purchases REAL DEFAULT 0,
                reputation INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('✅ Users table created');

        // Items table
        await dbHelper.query(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seller_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                quantity INTEGER DEFAULT 1,
                category TEXT,
                image_url TEXT,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'canceled')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);
        logger.info('✅ Items table created');

        // Deals table
        await dbHelper.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                buyer_id INTEGER NOT NULL,
                seller_id INTEGER NOT NULL,
                channel_id TEXT,
                price REAL NOT NULL,
                quantity INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'canceled')),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
                FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);
        logger.info('✅ Deals table created');

        // Auctions table
        await dbHelper.query(`
            CREATE TABLE IF NOT EXISTS auctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_by INTEGER NOT NULL,
                item_title TEXT NOT NULL,
                item_description TEXT,
                min_bid REAL NOT NULL,
                current_bid REAL,
                current_bidder_id INTEGER,
                duration_hours INTEGER DEFAULT 24,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (current_bidder_id) REFERENCES users (id) ON DELETE SET NULL
            )
        `);
        logger.info('✅ Auctions table created');

        // Auction bids table
        await dbHelper.query(`
            CREATE TABLE IF NOT EXISTS auction_bids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                auction_id INTEGER NOT NULL,
                bidder_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (auction_id) REFERENCES auctions (id) ON DELETE CASCADE,
                FOREIGN KEY (bidder_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);
        logger.info('✅ Auction bids table created');

        // Create indexes for better performance
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_items_seller_id ON items(seller_id)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON deals(buyer_id)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_deals_seller_id ON deals(seller_id)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time)`);
        await dbHelper.query(`CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id)`);

        logger.info('✅ Database indexes created');

        // Create triggers for updating updated_at timestamps
        await dbHelper.query(`
            CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
            AFTER UPDATE ON users
            BEGIN
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);

        await dbHelper.query(`
            CREATE TRIGGER IF NOT EXISTS update_items_updated_at 
            AFTER UPDATE ON items
            BEGIN
                UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);

        await dbHelper.query(`
            CREATE TRIGGER IF NOT EXISTS update_deals_updated_at 
            AFTER UPDATE ON deals
            BEGIN
                UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);

        logger.info('✅ Database triggers created');

        logger.info('🎉 SQLite database tables created successfully!');
        
    } catch (error) {
        logger.error('❌ Error creating SQLite database tables:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createSQLiteTables()
        .then(() => {
            logger.info('✅ SQLite database setup completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ SQLite database setup failed:', error);
            process.exit(1);
        });
}

module.exports = { createSQLiteTables };
