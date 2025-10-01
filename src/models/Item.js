const { dbAdapter, USE_SQLITE } = require('../database/dbAdapter');

class Item {
    constructor(data) {
        this.id = data.id;
        this.sellerId = data.seller_id;
        this.title = data.title;
        this.description = data.description;
        this.price = parseFloat(data.price);
        this.quantity = data.quantity;
        this.category = data.category;
        this.imageUrl = data.image_url;
        this.status = data.status;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create(sellerId, title, description, price, quantity, category = null, imageUrl = null) {
        try {
            if (USE_SQLITE) {
                // SQLite: Insert and then fetch
                const insertQuery = `
                    INSERT INTO items (seller_id, title, description, price, quantity, category, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                const insertResult = await dbAdapter.insert(insertQuery, [sellerId, title, description, price, quantity, category, imageUrl]);
                
                // Fetch the created item
                const selectQuery = 'SELECT * FROM items WHERE id = ?';
                const selectResult = await dbAdapter.query(selectQuery, [insertResult.id]);
                
                if (selectResult.rows && selectResult.rows.length > 0) {
                    return new Item(selectResult.rows[0]);
                }
                throw new Error('Failed to retrieve created item');
            } else {
                // PostgreSQL: Use RETURNING
                const query = `
                    INSERT INTO items (seller_id, title, description, price, quantity, category, image_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;
                const result = await dbAdapter.query(query, [sellerId, title, description, price, quantity, category, imageUrl]);
                return new Item(result.rows[0]);
            }
        } catch (error) {
            console.error('Error creating item:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = 'SELECT * FROM items WHERE id = $1';
            const result = await dbAdapter.query(query, [id]);
            if (result.rows.length === 0) return null;
            return new Item(result.rows[0]);
        } catch (error) {
            console.error('Error finding item:', error);
            throw error;
        }
    }

    static async findActive(searchTerm = '', category = '', sortBy = 'created_at', sortOrder = 'DESC', limit = 20, offset = 0) {
        try {
            let query = `
                SELECT i.*, u.username as seller_name
                FROM items i
                JOIN users u ON i.seller_id = u.discord_id
                WHERE i.status = 'active'
            `;
            const params = [];
            let paramCount = 0;

            if (searchTerm) {
                paramCount++;
                query += ` AND (i.title LIKE $${paramCount} OR i.description LIKE $${paramCount})`;
                params.push(`%${searchTerm}%`);
            }

            if (category) {
                paramCount++;
                query += ` AND i.category = $${paramCount}`;
                params.push(category);
            }

            // Validate sortBy to prevent SQL injection
            const validSortColumns = ['title', 'price', 'created_at'];
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            query += ` ORDER BY i.${sortColumn} ${order}`;
            
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(limit);
            
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);

            const result = await dbAdapter.query(query, params);
            return result.rows.map(row => new Item(row));
        } catch (error) {
            console.error('Error finding active items:', error);
            throw error;
        }
    }

    static async findBySeller(sellerId, status = 'active') {
        try {
            const query = 'SELECT * FROM items WHERE seller_id = $1 AND status = $2 ORDER BY created_at DESC';
            const result = await dbAdapter.query(query, [sellerId, status]);
            return result.rows.map(row => new Item(row));
        } catch (error) {
            console.error('Error finding items by seller:', error);
            throw error;
        }
    }

    static async getCategories() {
        try {
            const query = `
                SELECT DISTINCT category 
                FROM items 
                WHERE status = 'active' AND category IS NOT NULL 
                ORDER BY category
            `;
            const result = await dbAdapter.query(query);
            return result.rows.map(row => row.category);
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }

    async updateStatus(status) {
        try {
            if (USE_SQLITE) {
                const query = 'UPDATE items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                await dbAdapter.update(query, [status, this.id]);
                this.status = status;
                this.updatedAt = new Date();
                return this;
            } else {
                const query = 'UPDATE items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
                const result = await dbAdapter.query(query, [status, this.id]);
                this.status = result.rows[0].status;
                this.updatedAt = result.rows[0].updated_at;
                return this;
            }
        } catch (error) {
            console.error('Error updating item status:', error);
            throw error;
        }
    }

    async decreaseQuantity(amount = 1) {
        try {
            if (USE_SQLITE) {
                // Check current quantity first
                const checkQuery = 'SELECT quantity FROM items WHERE id = ?';
                const checkResult = await dbAdapter.query(checkQuery, [this.id]);
                
                if (checkResult.rows.length === 0 || checkResult.rows[0].quantity < amount) {
                    throw new Error('Insufficient quantity');
                }
                
                const query = 'UPDATE items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                await dbAdapter.update(query, [amount, this.id]);
                
                // Fetch updated quantity
                const selectResult = await dbAdapter.query(checkQuery, [this.id]);
                this.quantity = selectResult.rows[0].quantity;
                this.updatedAt = new Date();
                return this;
            } else {
                const query = `
                    UPDATE items 
                    SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $2 AND quantity >= $1
                    RETURNING *
                `;
                const result = await dbAdapter.query(query, [amount, this.id]);
                if (result.rows.length === 0) {
                    throw new Error('Insufficient quantity');
                }
                this.quantity = result.rows[0].quantity;
                this.updatedAt = result.rows[0].updated_at;
                return this;
            }
        } catch (error) {
            console.error('Error decreasing item quantity:', error);
            throw error;
        }
    }

    static async countActiveBySeller(sellerId) {
        try {
            const query = 'SELECT COUNT(*) as count FROM items WHERE seller_id = $1 AND status = $2';
            const result = await dbAdapter.query(query, [sellerId, 'active']);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Error counting active items by seller:', error);
            throw error;
        }
    }

    static async getSortedItems(sortBy = 'title', sortOrder = 'ASC', limit = 50) {
        try {
            // Validate sortBy to prevent SQL injection
            const validSortColumns = ['title', 'price', 'created_at'];
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'title';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const query = `
                SELECT * FROM items 
                WHERE status = 'active' 
                ORDER BY ${sortColumn} ${order}
                LIMIT $1
            `;
            const result = await dbAdapter.query(query, [limit]);
            return result.rows.map(row => new Item(row));
        } catch (error) {
            console.error('Error getting sorted items:', error);
            throw error;
        }
    }

}

module.exports = Item;
