const { db } = require('../database/connection');

class Auction {
    constructor(data) {
        this.id = data.id;
        this.itemId = data.item_id;
        this.createdBy = data.created_by;
        this.startTime = data.start_time;
        this.endTime = data.end_time;
        this.minBid = parseFloat(data.min_bid);
        this.step = parseFloat(data.step);
        this.status = data.status;
        this.winnerId = data.winner_id;
        this.finalPrice = data.final_price ? parseFloat(data.final_price) : null;
        this.createdAt = data.created_at;
    }

    static async create(itemId, createdBy, startTime, endTime, minBid, step = 1.0) {
        try {
            const query = `
                INSERT INTO auctions (item_id, created_by, start_time, end_time, min_bid, step)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const result = await db.query(query, [itemId, createdBy, startTime, endTime, minBid, step]);
            return new Auction(result.rows[0]);
        } catch (error) {
            console.error('Error creating auction:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = 'SELECT * FROM auctions WHERE id = $1';
            const result = await db.query(query, [id]);
            if (result.rows.length === 0) return null;
            return new Auction(result.rows[0]);
        } catch (error) {
            console.error('Error finding auction:', error);
            throw error;
        }
    }

    static async findActive() {
        try {
            const query = `
                SELECT a.*, i.title, i.description, i.image_url, u.username as creator_name
                FROM auctions a
                JOIN items i ON a.item_id = i.id
                JOIN users u ON a.created_by = u.discord_id
                WHERE a.status = 'active' AND a.end_time > NOW()
                ORDER BY a.end_time ASC
            `;
            const result = await db.query(query);
            return result.rows.map(row => ({
                auction: new Auction(row),
                item: {
                    title: row.title,
                    description: row.description,
                    imageUrl: row.image_url
                },
                creatorName: row.creator_name
            }));
        } catch (error) {
            console.error('Error finding active auctions:', error);
            throw error;
        }
    }

    static async findEnded() {
        try {
            const query = `
                SELECT a.*, i.title, i.description, i.image_url, u.username as creator_name
                FROM auctions a
                JOIN items i ON a.item_id = i.id
                JOIN users u ON a.created_by = u.discord_id
                WHERE a.status = 'active' AND a.end_time <= NOW()
                ORDER BY a.end_time DESC
            `;
            const result = await db.query(query);
            return result.rows.map(row => ({
                auction: new Auction(row),
                item: {
                    title: row.title,
                    description: row.description,
                    imageUrl: row.image_url
                },
                creatorName: row.creator_name
            }));
        } catch (error) {
            console.error('Error finding ended auctions:', error);
            throw error;
        }
    }

    async getHighestBid() {
        try {
            const query = `
                SELECT b.*, u.username as bidder_name
                FROM bids b
                JOIN users u ON b.bidder_id = u.discord_id
                WHERE b.auction_id = $1
                ORDER BY b.amount DESC, b.timestamp ASC
                LIMIT 1
            `;
            const result = await db.query(query, [this.id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error getting highest bid:', error);
            throw error;
        }
    }

    async getBids() {
        try {
            const query = `
                SELECT b.*, u.username as bidder_name
                FROM bids b
                JOIN users u ON b.bidder_id = u.discord_id
                WHERE b.auction_id = $1
                ORDER BY b.amount DESC, b.timestamp ASC
            `;
            const result = await db.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            console.error('Error getting bids:', error);
            throw error;
        }
    }

    async placeBid(bidderId, amount) {
        try {
            // Check if auction is still active
            if (this.status !== 'active' || new Date() > this.endTime) {
                throw new Error('Auction is not active');
            }

            // Get current highest bid
            const highestBid = await this.getHighestBid();
            const minBidAmount = highestBid ? highestBid.amount + this.step : this.minBid;

            if (amount < minBidAmount) {
                throw new Error(`Minimum bid amount is ${minBidAmount}`);
            }

            const query = `
                INSERT INTO bids (auction_id, bidder_id, amount)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            const result = await db.query(query, [this.id, bidderId, amount]);
            return result.rows[0];
        } catch (error) {
            console.error('Error placing bid:', error);
            throw error;
        }
    }

    async endAuction() {
        try {
            const highestBid = await this.getHighestBid();
            
            const query = `
                UPDATE auctions 
                SET status = 'ended', winner_id = $1, final_price = $2
                WHERE id = $3
                RETURNING *
            `;
            const result = await db.query(query, [
                highestBid ? highestBid.bidder_id : null,
                highestBid ? highestBid.amount : null,
                this.id
            ]);

            this.status = result.rows[0].status;
            this.winnerId = result.rows[0].winner_id;
            this.finalPrice = result.rows[0].final_price;
            return this;
        } catch (error) {
            console.error('Error ending auction:', error);
            throw error;
        }
    }

    async updateStatus(status) {
        try {
            const query = 'UPDATE auctions SET status = $1 WHERE id = $2 RETURNING *';
            const result = await db.query(query, [status, this.id]);
            this.status = result.rows[0].status;
            return this;
        } catch (error) {
            console.error('Error updating auction status:', error);
            throw error;
        }
    }

    isActive() {
        return this.status === 'active' && new Date() < this.endTime;
    }

    isEnded() {
        return this.status === 'ended' || new Date() >= this.endTime;
    }

    getTimeRemaining() {
        const now = new Date();
        const end = new Date(this.endTime);
        const diff = end - now;
        
        if (diff <= 0) return null;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days, hours, minutes };
    }
}

module.exports = Auction;
