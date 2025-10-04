import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    marketChannelId: process.env.MARKET_CHANNEL_ID,
    auctioneerRoleId: process.env.AUCTIONEER_ROLE_ID,
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'file:./data/market.db',
  },

  // Bot Configuration
  bot: {
    dealTimeoutHours: parseInt(process.env.DEAL_TIMEOUT_HOURS) || 12,
    maxListingsPerUser: parseInt(process.env.MAX_LISTINGS_PER_USER) || 10,
    maxActiveDealsPerUser: parseInt(process.env.MAX_ACTIVE_DEALS_PER_USER) || 5,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Validation
  validate() {
    const required = [
      'DISCORD_TOKEN',
      'CLIENT_ID',
      'GUILD_ID',
      'MARKET_CHANNEL_ID',
      'AUCTIONEER_ROLE_ID',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  },
};
