const { db: pgDb } = require('./connection');
const { dbHelper: sqliteDb } = require('./sqliteConnection');
const logger = require('../utils/logger');

// Determine which database to use
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.env.DATABASE_URL === undefined;

let db;

if (USE_SQLITE) {
    logger.info('🗄️ Using SQLite database for development');
    db = sqliteDb;
} else {
    logger.info('🗄️ Using PostgreSQL database');
    db = pgDb;
}

// Unified database interface
const dbAdapter = {
    // Query method
    query: async (sql, params = []) => {
        try {
            if (USE_SQLITE) {
                // Convert PostgreSQL syntax to SQLite
                const sqliteSQL = convertPostgreSQLToSQLite(sql);
                
                // Check if this is an INSERT/UPDATE with RETURNING
                if (sqliteSQL.includes('RETURNING')) {
                    // Remove RETURNING clause and execute
                    const cleanSQL = sqliteSQL.replace(/RETURNING \*/g, '').trim();
                    await db.query(cleanSQL, params);
                    
                    // Return empty result (caller should fetch separately if needed)
                    return { rows: [], rowCount: 0 };
                }
                
                return await db.query(sqliteSQL, params);
            } else {
                return await db.query(sql, params);
            }
        } catch (error) {
            logger.error('Database query error:', error);
            throw error;
        }
    },

    // Insert method
    insert: async (sql, params = []) => {
        try {
            if (USE_SQLITE) {
                const sqliteSQL = convertPostgreSQLToSQLite(sql);
                return await db.insert(sqliteSQL, params);
            } else {
                return await db.query(sql, params);
            }
        } catch (error) {
            logger.error('Database insert error:', error);
            throw error;
        }
    },

    // Update method
    update: async (sql, params = []) => {
        try {
            if (USE_SQLITE) {
                const sqliteSQL = convertPostgreSQLToSQLite(sql);
                return await db.update(sqliteSQL, params);
            } else {
                return await db.query(sql, params);
            }
        } catch (error) {
            logger.error('Database update error:', error);
            throw error;
        }
    },

    // Get client (for transactions)
    getClient: () => {
        if (USE_SQLITE) {
            return db;
        } else {
            return db;
        }
    },

    // Close connection
    close: async () => {
        if (USE_SQLITE) {
            return await db.close();
        }
        // PostgreSQL connection is managed by the pool
    }
};

// Convert PostgreSQL syntax to SQLite
function convertPostgreSQLToSQLite(sql) {
    let convertedSQL = sql;
    
    // Convert positional parameters $1, $2 to ? for SQLite
    let paramCounter = 1;
    convertedSQL = convertedSQL.replace(/\$\d+/g, () => {
        return '?';
    });
    
    // Convert SERIAL to INTEGER PRIMARY KEY AUTOINCREMENT
    convertedSQL = convertedSQL.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    
    // Convert DECIMAL to REAL
    convertedSQL = convertedSQL.replace(/DECIMAL\(\d+,\d+\)/g, 'REAL');
    
    // Convert TIMESTAMP to DATETIME
    convertedSQL = convertedSQL.replace(/TIMESTAMP/g, 'DATETIME');
    
    // Convert TEXT[] to TEXT (for arrays, will store as JSON)
    convertedSQL = convertedSQL.replace(/TEXT\[\]/g, 'TEXT');
    
    // Convert CURRENT_TIMESTAMP
    convertedSQL = convertedSQL.replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP');
    
    // Convert CURRENT_DATETIME
    convertedSQL = convertedSQL.replace(/CURRENT_DATETIME/g, 'CURRENT_TIMESTAMP');
    
    // Convert ILIKE to LIKE (SQLite is case-insensitive by default)
    convertedSQL = convertedSQL.replace(/ILIKE/g, 'LIKE');
    
    // Convert ON CONFLICT for SQLite
    convertedSQL = convertedSQL.replace(/ON CONFLICT \(([^)]+)\) DO UPDATE SET/g, 'ON CONFLICT($1) DO UPDATE SET');
    
    return convertedSQL;
}

module.exports = { dbAdapter, USE_SQLITE };
