import { REST, Routes } from 'discord.js';
import { config } from '../src/config/index.js';
import { commands } from '../src/commands/index.js';
import logger from '../src/utils/logger.js';

// Validate configuration
config.validate();

const rest = new REST({ timeout: 30000 }).setToken(config.discord.token);

async function deployCommands() {
  try {
    logger.info('Started refreshing application (/) commands.');

    // Prepare commands data
    const commandsData = commands.map(command => command.data.toJSON());

    // Deploy commands to guild (for testing) or globally
    let route;
    if (config.discord.guildId) {
      // Deploy to specific guild (faster for development)
      route = Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId);
      logger.info(`Deploying commands to guild: ${config.discord.guildId}`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      route = Routes.applicationCommands(config.discord.clientId);
      logger.info('Deploying commands globally');
    }

    const data = await rest.put(route, { body: commandsData });

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    
    // Log deployed commands
    commands.forEach(command => {
      logger.info(`- ${command.data.name}: ${command.data.description}`);
    });

  } catch (error) {
    logger.error('Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();
