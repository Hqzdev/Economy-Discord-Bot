const { db } = require('../database/connection');

class Deal {
    constructor(data) {
        this.id = data.id;
        this.itemId = data.item_id;
        this.buyerId = data.buyer_id;
        this.sellerId = data.seller_id;
        this.channelId = data.channel_id;
        this.status = data.status;
        this.price = parseFloat(data.price);
        this.quantity = data.quantity;
        this.createdAt = data.created_at;
        this.closedAt = data.closed_at;
        this.notes = data.notes;
    }

    static async create(itemId, buyerId, sellerId, price, quantity = 1, channelId = null) {
        try {
            const query = `
                INSERT INTO deals (item_id, buyer_id, seller_id, price, quantity, channel_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const result = await db.query(query, [itemId, buyerId, sellerId, price, quantity, channelId]);
            return new Deal(result.rows[0]);
        } catch (error) {
            console.error('Error creating deal:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = 'SELECT * FROM deals WHERE id = $1';
            const result = await db.query(query, [id]);
            if (result.rows.length === 0) return null;
            return new Deal(result.rows[0]);
        } catch (error) {
            console.error('Error finding deal:', error);
            throw error;
        }
    }

    static async findActiveByUser(userId) {
        try {
            const query = `
                SELECT d.*, i.title, i.description, i.image_url,
                       seller.username as seller_name, buyer.username as buyer_name
                FROM deals d
                JOIN items i ON d.item_id = i.id
                JOIN users seller ON d.seller_id = seller.discord_id
                JOIN users buyer ON d.buyer_id = buyer.discord_id
                WHERE (d.buyer_id = $1 OR d.seller_id = $1) AND d.status = 'active'
                ORDER BY d.created_at DESC
            `;
            const result = await db.query(query, [userId]);
            return result.rows.map(row => ({
                deal: new Deal(row),
                item: {
                    title: row.title,
                    description: row.description,
                    imageUrl: row.image_url
                },
                sellerName: row.seller_name,
                buyerName: row.buyer_name
            }));
        } catch (error) {
            console.error('Error finding active deals by user:', error);
            throw error;
        }
    }

    static async findHistoryByUser(userId, limit = 20, offset = 0) {
        try {
            const query = `
                SELECT d.*, i.title, i.description, i.image_url,
                       seller.username as seller_name, buyer.username as buyer_name
                FROM deals d
                JOIN items i ON d.item_id = i.id
                JOIN users seller ON d.seller_id = seller.discord_id
                JOIN users buyer ON d.buyer_id = buyer.discord_id
                WHERE (d.buyer_id = $1 OR d.seller_id = $1) AND d.status IN ('closed', 'completed', 'canceled')
                ORDER BY d.closed_at DESC
                LIMIT $2 OFFSET $3
            `;
            const result = await db.query(query, [userId, limit, offset]);
            return result.rows.map(row => ({
                deal: new Deal(row),
                item: {
                    title: row.title,
                    description: row.description,
                    imageUrl: row.image_url
                },
                sellerName: row.seller_name,
                buyerName: row.buyer_name
            }));
        } catch (error) {
            console.error('Error finding deal history by user:', error);
            throw error;
        }
    }

    static async findAllActive(limit = 50, offset = 0) {
        try {
            const query = `
                SELECT d.*, i.title, i.description, i.image_url,
                       seller.username as seller_name, buyer.username as buyer_name
                FROM deals d
                JOIN items i ON d.item_id = i.id
                JOIN users seller ON d.seller_id = seller.discord_id
                JOIN users buyer ON d.buyer_id = buyer.discord_id
                WHERE d.status = 'active'
                ORDER BY d.created_at DESC
                LIMIT $1 OFFSET $2
            `;
            const result = await db.query(query, [limit, offset]);
            return result.rows.map(row => ({
                deal: new Deal(row),
                item: {
                    title: row.title,
                    description: row.description,
                    imageUrl: row.image_url
                },
                sellerName: row.seller_name,
                buyerName: row.buyer_name
            }));
        } catch (error) {
            console.error('Error finding all active deals:', error);
            throw error;
        }
    }

    async updateStatus(status, notes = null) {
        try {
            const query = `
                UPDATE deals 
                SET status = $1, closed_at = $2, notes = $3
                WHERE id = $4
                RETURNING *
            `;
            const closedAt = status === 'active' ? null : new Date();
            const result = await db.query(query, [status, closedAt, notes, this.id]);
            
            this.status = result.rows[0].status;
            this.closedAt = result.rows[0].closed_at;
            this.notes = result.rows[0].notes;
            return this;
        } catch (error) {
            console.error('Error updating deal status:', error);
            throw error;
        }
    }

    async updateChannel(channelId) {
        try {
            const query = 'UPDATE deals SET channel_id = $1 WHERE id = $2 RETURNING *';
            const result = await db.query(query, [channelId, this.id]);
            this.channelId = result.rows[0].channel_id;
            return this;
        } catch (error) {
            console.error('Error updating deal channel:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_deals,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_deals,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deals,
                    COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_deals,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN price * quantity END), 0) as total_volume
                FROM deals
            `;
            const result = await db.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting deal stats:', error);
            throw error;
        }
    }
}

module.exports = Deal;
