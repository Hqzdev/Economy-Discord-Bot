const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// Create database connection
const dbPath = path.join(__dirname, '../../data/economy_bot.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('❌ Error opening SQLite database:', err);
        throw err;
    }
    logger.info('✅ Connected to SQLite database');
});

// Helper function to promisify database operations
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                logger.error('Database query error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function runInsert(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                logger.error('Database insert error:', err);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

function runUpdate(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                logger.error('Database update error:', err);
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
}

// Database helper object
const dbHelper = {
    query: async (sql, params = []) => {
        try {
            const rows = await runQuery(sql, params);
            return { rows, rowCount: rows.length };
        } catch (error) {
            logger.error('Query error:', error);
            throw error;
        }
    },

    insert: async (sql, params = []) => {
        try {
            const result = await runInsert(sql, params);
            return result;
        } catch (error) {
            logger.error('Insert error:', error);
            throw error;
        }
    },

    update: async (sql, params = []) => {
        try {
            const result = await runUpdate(sql, params);
            return result;
        } catch (error) {
            logger.error('Update error:', error);
            throw error;
        }
    },

    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    logger.info('✅ Database connection closed');
                    resolve();
                }
            });
        });
    }
};

module.exports = { db, dbHelper };
