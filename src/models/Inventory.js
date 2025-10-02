const { dbAdapter, USE_SQLITE } = require('../database/dbAdapter');

class Inventory {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.itemId = data.item_id;
        this.quantity = data.quantity;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create(userId, itemId, quantity = 1) {
        try {
            if (USE_SQLITE) {
                // Check if user already has this item
                const existingQuery = 'SELECT * FROM inventory WHERE user_id = ? AND item_id = ?';
                const existingResult = await dbAdapter.query(existingQuery, [userId, itemId]);
                
                if (existingResult.rows && existingResult.rows.length > 0) {
                    // Update existing quantity
                    const updateQuery = 'UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND item_id = ?';
                    await dbAdapter.update(updateQuery, [quantity, userId, itemId]);
                    
                    // Fetch updated record
                    const selectResult = await dbAdapter.query(existingQuery, [userId, itemId]);
                    return new Inventory(selectResult.rows[0]);
                } else {
                    // Insert new record
                    const insertQuery = `
                        INSERT INTO inventory (user_id, item_id, quantity)
                        VALUES (?, ?, ?)
                    `;
                    const insertResult = await dbAdapter.insert(insertQuery, [userId, itemId, quantity]);
                    
                    // Fetch the created record
                    const selectQuery = 'SELECT * FROM inventory WHERE id = ?';
                    const selectResult = await dbAdapter.query(selectQuery, [insertResult.id]);
                    return new Inventory(selectResult.rows[0]);
                }
            } else {
                // PostgreSQL: Use UPSERT
                const query = `
                    INSERT INTO inventory (user_id, item_id, quantity)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, item_id) 
                    DO UPDATE SET quantity = inventory.quantity + $3, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                const result = await dbAdapter.query(query, [userId, itemId, quantity]);
                return new Inventory(result.rows[0]);
            }
        } catch (error) {
            console.error('Error creating inventory item:', error);
            throw error;
        }
    }

    static async findByUser(userId) {
        try {
            const query = `
                SELECT i.*, inv.quantity, inv.id as inventory_id
                FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                WHERE inv.user_id = $1
                ORDER BY i.title ASC
            `;
            const result = await dbAdapter.query(query, [userId]);
            return result.rows.map(row => ({
                inventoryId: row.inventory_id,
                itemId: row.item_id,
                title: row.title,
                description: row.description,
                price: row.price,
                category: row.category,
                imageUrl: row.image_url,
                quantity: row.quantity
            }));
        } catch (error) {
            console.error('Error finding inventory by user:', error);
            throw error;
        }
    }

    static async findByUserAndItem(userId, itemId) {
        try {
            const query = 'SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2';
            const result = await dbAdapter.query(query, [userId, itemId]);
            if (result.rows.length === 0) return null;
            return new Inventory(result.rows[0]);
        } catch (error) {
            console.error('Error finding inventory item:', error);
            throw error;
        }
    }

    async decreaseQuantity(amount = 1) {
        try {
            if (USE_SQLITE) {
                // Check current quantity first
                const checkQuery = 'SELECT quantity FROM inventory WHERE id = ?';
                const checkResult = await dbAdapter.query(checkQuery, [this.id]);
                
                if (checkResult.rows.length === 0 || checkResult.rows[0].quantity < amount) {
                    throw new Error('Insufficient quantity');
                }
                
                const query = 'UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                await dbAdapter.update(query, [amount, this.id]);
                
                // Fetch updated quantity
                const selectResult = await dbAdapter.query(checkQuery, [this.id]);
                this.quantity = selectResult.rows[0].quantity;
                this.updatedAt = new Date();
                
                // If quantity is 0, delete the record
                if (this.quantity <= 0) {
                    await dbAdapter.update('DELETE FROM inventory WHERE id = ?', [this.id]);
                }
                
                return this;
            } else {
                const query = `
                    UPDATE inventory 
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
                
                // If quantity is 0, delete the record
                if (this.quantity <= 0) {
                    await dbAdapter.query('DELETE FROM inventory WHERE id = $1', [this.id]);
                }
                
                return this;
            }
        } catch (error) {
            console.error('Error decreasing inventory quantity:', error);
            throw error;
        }
    }

    static async deleteByUserAndItem(userId, itemId) {
        try {
            const query = 'DELETE FROM inventory WHERE user_id = $1 AND item_id = $2';
            await dbAdapter.query(query, [userId, itemId]);
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    }
}

module.exports = Inventory;
