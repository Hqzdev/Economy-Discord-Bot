const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`✅ Bot logged in as ${client.user.tag}`);
        logger.info(`🌐 Connected to ${client.guilds.cache.size} guilds`);
        
        // Set bot status
        client.user.setActivity('Рынок ролевого проекта', { type: 'WATCHING' });
        
        // Log guild information
        client.guilds.cache.forEach(guild => {
            logger.info(`📊 Guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
        });
    }
};
