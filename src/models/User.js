const { dbAdapter, USE_SQLITE } = require('../database/dbAdapter');

class User {
    constructor(discordId, username, roles = []) {
        this.discordId = discordId;
        this.username = username;
        // Ensure roles is always an array
        this.roles = Array.isArray(roles) ? roles : (typeof roles === 'string' ? JSON.parse(roles) : []);
    }

    static async create(discordId, username, roles = []) {
        try {
            // Convert roles to JSON string for SQLite
            const rolesValue = USE_SQLITE ? JSON.stringify(roles) : roles;
            
            const query = `
                INSERT INTO users (discord_id, username, roles)
                VALUES ($1, $2, $3)
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
                    return new User(selectResult.rows[0].discord_id, selectResult.rows[0].username, selectResult.rows[0].roles);
                }
            }
            
            return new User(result.rows[0].discord_id, result.rows[0].username, result.rows[0].roles);
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
            
            const userData = result.rows[0];
            return new User(userData.discord_id, userData.username, userData.roles);
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
