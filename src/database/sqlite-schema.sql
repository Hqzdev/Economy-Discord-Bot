-- SQLite Schema for Economy Discord Bot

-- Users table
CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    roles TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items (lots) table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    category TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'sold')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(discord_id)
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    channel_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'canceled', 'completed')),
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    notes TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (buyer_id) REFERENCES users(discord_id),
    FOREIGN KEY (seller_id) REFERENCES users(discord_id)
);

-- Auctions table
CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    min_bid REAL NOT NULL CHECK (min_bid > 0),
    step REAL NOT NULL DEFAULT 1.00 CHECK (step > 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'canceled')),
    winner_id TEXT,
    final_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (created_by) REFERENCES users(discord_id),
    FOREIGN KEY (winner_id) REFERENCES users(discord_id)
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    bidder_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id),
    FOREIGN KEY (bidder_id) REFERENCES users(discord_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(discord_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);

CREATE INDEX IF NOT EXISTS idx_deals_buyer ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_seller ON deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

