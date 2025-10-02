const { dbAdapter, USE_SQLITE } = require('../database/dbAdapter');

class User {
    constructor(data) {
        if (typeof data === 'object' && data.discord_id) {
            // Full object from DB
            this.discordId = data.discord_id;
            this.username = data.username;
            this.roles = Array.isArray(data.roles) ? data.roles : (typeof data.roles === 'string' ? JSON.parse(data.roles) : []);
            this.cash = parseFloat(data.cash) || 0;
            this.bank = parseFloat(data.bank) || 0;
            this.createdAt = data.created_at;
            this.updatedAt = data.updated_at;
        } else {
            // Legacy constructor
            this.discordId = arguments[0];
            this.username = arguments[1];
            this.roles = Array.isArray(arguments[2]) ? arguments[2] : [];
            this.cash = 0;
            this.bank = 0;
        }
    }

    static async create(discordId, username, roles = []) {
        try {
            // Convert roles to JSON string for SQLite
            const rolesValue = USE_SQLITE ? JSON.stringify(roles) : roles;
            
            const query = `
                INSERT INTO users (discord_id, username, roles, cash, bank)
                VALUES ($1, $2, $3, 0, 0)
                ON CONFLICT (discord_id) DO UPDATE SET
                    username = EXCLUDED.username,
                    roles = EXCLUDED.roles,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const result = await dbAdapter.query(query, [discordId, username, rolesValue]);
            
            if (!result.rows || result.rows.length === 0) {
                // For SQLite, we need to fetch the inserted user
                const selectQuery = 'SELECT * FROM users WHERE discord_id = $1';
                const selectResult = await dbAdapter.query(selectQuery, [discordId]);
                if (selectResult.rows && selectResult.rows.length > 0) {
                    return new User(selectResult.rows[0]);
                }
            }
            
            return new User(result.rows[0]);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async findByDiscordId(discordId) {
        try {
            const query = 'SELECT * FROM users WHERE discord_id = $1';
            const result = await dbAdapter.query(query, [discordId]);
            if (result.rows.length === 0) return null;
            
            return new User(result.rows[0]);
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static async updateRoles(discordId, roles) {
        try {
            // Convert roles to JSON string for SQLite
            const rolesValue = USE_SQLITE ? JSON.stringify(roles) : roles;
            
            const query = `
                UPDATE users 
                SET roles = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE discord_id = $2
                RETURNING *
            `;
            const result = await dbAdapter.query(query, [rolesValue, discordId]);
            return result.rows[0];
        } catch (error) {
            console.error('Error updating user roles:', error);
            throw error;
        }
    }

    async addCash(amount) {
        try {
            if (USE_SQLITE) {
                const query = `
                    UPDATE users 
                    SET cash = cash + ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE discord_id = ?
                `;
                await dbAdapter.update(query, [amount, this.discordId]);
            } else {
                const query = `
                    UPDATE users 
                    SET cash = cash + $1, updated_at = CURRENT_TIMESTAMP 
                    WHERE discord_id = $2
                `;
                await dbAdapter.query(query, [amount, this.discordId]);
            }
            this.cash += amount;
            return this;
        } catch (error) {
            console.error('Error adding cash:', error);
            throw error;
        }
    }

    async addBank(amount) {
        try {
            if (USE_SQLITE) {
                const query = `
                    UPDATE users 
                    SET bank = bank + ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE discord_id = ?
                `;
                await dbAdapter.update(query, [amount, this.discordId]);
            } else {
                const query = `
                    UPDATE users 
                    SET bank = bank + $1, updated_at = CURRENT_TIMESTAMP 
                    WHERE discord_id = $2
                `;
                await dbAdapter.query(query, [amount, this.discordId]);
            }
            this.bank += amount;
            return this;
        } catch (error) {
            console.error('Error adding bank:', error);
            throw error;
        }
    }

    async transferToBank(amount) {
        if (this.cash < amount) {
            throw new Error('Insufficient cash');
        }
        
        try {
            const query = `
                UPDATE users 
                SET cash = cash - $1, bank = bank + $1, updated_at = CURRENT_TIMESTAMP 
                WHERE discord_id = $2
            `;
            await dbAdapter.query(query, [amount, this.discordId]);
            this.cash -= amount;
            this.bank += amount;
            return this;
        } catch (error) {
            console.error('Error transferring to bank:', error);
            throw error;
        }
    }

    async withdrawFromBank(amount) {
        if (this.bank < amount) {
            throw new Error('Insufficient bank balance');
        }
        
        try {
            const query = `
                UPDATE users 
                SET cash = cash + $1, bank = bank - $1, updated_at = CURRENT_TIMESTAMP 
                WHERE discord_id = $2
            `;
            await dbAdapter.query(query, [amount, this.discordId]);
            this.cash += amount;
            this.bank -= amount;
            return this;
        } catch (error) {
            console.error('Error withdrawing from bank:', error);
            throw error;
        }
    }

    hasRole(roleId) {
        return this.roles.includes(roleId);
    }

    isAdmin() {
        return this.hasRole(process.env.ADMIN_ROLE_ID);
    }

    isModerator() {
        return this.hasRole(process.env.MODERATOR_ROLE_ID) || this.isAdmin();
    }

    canCreateAuction() {
        return this.hasRole(process.env.AUCTION_ROLE_ID) || this.isModerator();
    }
}

module.exports = User;
