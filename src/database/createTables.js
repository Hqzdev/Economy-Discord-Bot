const { db } = require('./connection');
const logger = require('../utils/logger');

async function createTables() {
    try {
        logger.info('🗄️ Creating database tables...');

        // Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                discord_id VARCHAR(20) UNIQUE NOT NULL,
                username VARCHAR(100) NOT NULL,
                display_name VARCHAR(100),
                balance DECIMAL(15,2) DEFAULT 0,
                total_sales DECIMAL(15,2) DEFAULT 0,
                total_purchases DECIMAL(15,2) DEFAULT 0,
                reputation INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('✅ Users table created');

        // Items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                price DECIMAL(15,2) NOT NULL,
                quantity INTEGER DEFAULT 1,
                category VARCHAR(50),
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'canceled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('✅ Items table created');

        // Deals table
        await db.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
                buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                channel_id VARCHAR(20),
                price DECIMAL(15,2) NOT NULL,
                quantity INTEGER DEFAULT 1,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'canceled')),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('✅ Deals table created');

        // Auctions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS auctions (
                id SERIAL PRIMARY KEY,
                created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
                item_title VARCHAR(200) NOT NULL,
                item_description TEXT,
                min_bid DECIMAL(15,2) NOT NULL,
                current_bid DECIMAL(15,2),
                current_bidder_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                duration_hours INTEGER DEFAULT 24,
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('✅ Auctions table created');

        // Auction bids table
        await db.query(`
            CREATE TABLE IF NOT EXISTS auction_bids (
                id SERIAL PRIMARY KEY,
                auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
                bidder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('✅ Auction bids table created');

        // Create indexes for better performance
        await db.query(`CREATE INDEX IF NOT EXISTS idx_items_seller_id ON items(seller_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON deals(buyer_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_deals_seller_id ON deals(seller_id)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time)`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id)`);

        logger.info('✅ Database indexes created');

        // Create triggers for updating updated_at timestamps
        await db.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        await db.query(`
            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await db.query(`
            DROP TRIGGER IF EXISTS update_items_updated_at ON items;
            CREATE TRIGGER update_items_updated_at
                BEFORE UPDATE ON items
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await db.query(`
            DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
            CREATE TRIGGER update_deals_updated_at
                BEFORE UPDATE ON deals
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        logger.info('✅ Database triggers created');

        logger.info('🎉 Database tables created successfully!');
        
    } catch (error) {
        logger.error('❌ Error creating database tables:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createTables()
        .then(() => {
            logger.info('✅ Database setup completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = { createTables };
