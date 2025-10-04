import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from './config/index.js';
import { commands } from './commands/index.js';
import { InteractionHandler } from './handlers/index.js';
import db from './database/jsonDb.js';
import logger from './utils/logger.js';
import { DealService } from './services/simpleDealService.js';
import { AuditService } from './services/simpleAuditService.js';
import { AuctionManager } from './services/auctionManager.js';

// Validate configuration
config.validate();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  allowedMentions: {
    parse: [],
    roles: [],
    users: [],
    repliedUser: false,
  },
});

// Create command collection
client.commands = new Collection();

// Register commands
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

// Create interaction handler
const interactionHandler = new InteractionHandler();
const dealService = new DealService();
const auditService = new AuditService();
const auctionManager = new AuctionManager(client);

// Rate limiting
const cooldowns = new Map();

// Event: Bot ready
client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`Бот готов! Вошёл как ${readyClient.user.tag}`);
  
  // Set bot activity
  client.user.setActivity('рынок ролевого сервера', { type: 'WATCHING' });

  // Start auction manager
  auctionManager.start();

  // Cleanup expired deals every hour
  setInterval(async () => {
    try {
      const cleanedCount = await dealService.cleanupExpiredDeals();
      if (cleanedCount > 0) {
        logger.info(`Очищено ${cleanedCount} истёкших сделок`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired deals:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Cleanup old audit logs daily
  setInterval(async () => {
    try {
      const cleanedCount = await auditService.cleanupOldLogs(30);
      if (cleanedCount > 0) {
        logger.info(`Очищено ${cleanedCount} старых логов аудита`);
      }
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
});

// Event: Guild member add (for user creation)
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // This will be handled when user first interacts with bot
    logger.info(`New member joined: ${member.user.tag}`);
  } catch (error) {
    logger.error('Error handling guild member add:', error);
  }
});

// Event: Guild member remove (cleanup active deals)
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    // Cancel all pending deals for the user who left
    const user = db.getUserByDiscordId(member.user.id);

    if (user) {
      const pendingDeals = db.getUserActiveDeals(user.id);

      for (const deal of pendingDeals) {
        await dealService.cancelDeal(deal.id, 'SYSTEM');
      }

      if (pendingDeals.length > 0) {
        logger.info(`Cancelled ${pendingDeals.length} deals for user who left: ${member.user.tag}`);
      }
    }
  } catch (error) {
    logger.error('Error handling guild member remove:', error);
  }
});

// Event: Slash command interaction
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    // Rate limiting
    const cooldownKey = `${interaction.user.id}_${interaction.commandName}`;
    const cooldownAmount = 3000; // 3 seconds

    if (cooldowns.has(cooldownKey)) {
      const expirationTime = cooldowns.get(cooldownKey) + cooldownAmount;
      
      if (Date.now() < expirationTime) {
        const timeLeft = (expirationTime - Date.now()) / 1000;
        await interaction.reply({
          content: `⏰ Подождите ${timeLeft.toFixed(1)} секунд перед использованием команды снова.`,
          ephemeral: true,
        });
        return;
      }
    }

    cooldowns.set(cooldownKey, Date.now());

    // Execute command
    await command.execute(interaction);
    
  } catch (error) {
    logger.error('Error handling slash command:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Произошла ошибка при выполнении команды',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: '❌ Произошла ошибка при выполнении команды',
          ephemeral: true,
        });
      }
    } catch (followUpError) {
      logger.error('Error in command error handler:', followUpError);
    }
  }
});

// Event: Other interactions (buttons, modals, selects)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) return;

    // Rate limiting for interactions
    const cooldownKey = `${interaction.user.id}_interaction`;
    const cooldownAmount = 1000; // 1 second

    if (cooldowns.has(cooldownKey)) {
      const expirationTime = cooldowns.get(cooldownKey) + cooldownAmount;
      
      if (Date.now() < expirationTime) {
        return; // Silently ignore rapid interactions
      }
    }

    cooldowns.set(cooldownKey, Date.now());

    await interactionHandler.handle(interaction);
    
  } catch (error) {
    logger.error('Error handling interaction:', error);
  }
});

// Event: Error handling
client.on(Events.Error, (error) => {
  logger.error('Discord client error:', error);
});

client.on(Events.Warn, (info) => {
  logger.warn('Discord client warning:', info);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  try {
    await client.destroy();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  
  try {
    auctionManager.stop();
    await client.destroy();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the bot
async function start() {
  try {
    // JSON database doesn't need connection
    logger.info('Using JSON database');
    
    // Login to Discord
    await client.login(config.discord.token);
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

start();