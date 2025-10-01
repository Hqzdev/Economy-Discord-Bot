const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Redis connection (optional)
let redisClient = null;
let redisConnected = false;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
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
            redisConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('✅ Connected to Redis');
            redisConnected = true;
        });

        // Initialize Redis connection with timeout
        Promise.race([
            redisClient.connect(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
            )
        ]).catch((err) => {
            console.warn('⚠️ Redis connection failed, continuing without Redis:', err.message);
            redisClient = null;
            redisConnected = false;
        });
    } catch (error) {
        console.warn('⚠️ Failed to initialize Redis client:', error.message);
        redisClient = null;
        redisConnected = false;
    }
} else {
    console.log('ℹ️ Redis not configured, running without Redis');
}

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
    
    // Redis helper functions (with fallback to no-op if Redis unavailable)
    redis: {
        get: async (key) => {
            if (!redisClient || !redisConnected) {
                console.warn('Redis not available, skipping GET operation');
                return null;
            }
            try {
                const value = await redisClient.get(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Redis GET error:', error);
                return null;
            }
        },
        
        set: async (key, value, expireSeconds = null) => {
            if (!redisClient || !redisConnected) {
                console.warn('Redis not available, skipping SET operation');
                return false;
            }
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
            if (!redisClient || !redisConnected) {
                console.warn('Redis not available, skipping DEL operation');
                return false;
            }
            try {
                await redisClient.del(key);
                return true;
            } catch (error) {
                console.error('Redis DEL error:', error);
                return false;
            }
        },
        
        exists: async (key) => {
            if (!redisClient || !redisConnected) {
                console.warn('Redis not available, skipping EXISTS operation');
                return false;
            }
            try {
                const result = await redisClient.exists(key);
                return result === 1;
            } catch (error) {
                console.error('Redis EXISTS error:', error);
                return false;
            }
        },
        
        isConnected: () => redisConnected
    }
};

module.exports = { db, pool, redisClient };
