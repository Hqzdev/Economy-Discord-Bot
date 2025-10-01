const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];

// Load all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Create REST instance
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        let data;
        
        if (process.env.DISCORD_GUILD_ID && process.env.DISCORD_GUILD_ID !== 'your_discord_server_id_here') {
            // Deploy to specific guild (faster for development)
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} application (/) commands for guild ${process.env.DISCORD_GUILD_ID}.`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            data = await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally.`);
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
