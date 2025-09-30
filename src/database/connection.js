const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Redis connection
let redisClient;
if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
        url: process.env.REDIS_URL
    });
} else {
    redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    });
}

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('✅ Connected to Redis');
});

// Initialize Redis connection
redisClient.connect().catch(console.error);

// Database helper functions
const db = {
    query: async (text, params) => {
        const start = Date.now();
        try {
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },
    
    getClient: () => pool,
    
    // Redis helper functions
    redis: {
        get: async (key) => {
            try {
                const value = await redisClient.get(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Redis GET error:', error);
                return null;
            }
        },
        
        set: async (key, value, expireSeconds = null) => {
            try {
                const stringValue = JSON.stringify(value);
                if (expireSeconds) {
                    await redisClient.setEx(key, expireSeconds, stringValue);
                } else {
                    await redisClient.set(key, stringValue);
                }
                return true;
            } catch (error) {
                console.error('Redis SET error:', error);
                return false;
            }
        },
        
        del: async (key) => {
            try {
                await redisClient.del(key);
                return true;
            } catch (error) {
                console.error('Redis DEL error:', error);
                return false;
            }
        },
        
        exists: async (key) => {
            try {
                const result = await redisClient.exists(key);
                return result === 1;
            } catch (error) {
                console.error('Redis EXISTS error:', error);
                return false;
            }
        }
    }
};

module.exports = { db, pool, redisClient };
