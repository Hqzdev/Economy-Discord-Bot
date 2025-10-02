const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Посмотреть свой баланс')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь (опционально)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;

            // Get user
            let user = await User.findByDiscordId(targetUser.id);
            if (!user) {
                user = await User.create(targetUser.id, targetUser.username, []);
            }

            const total = user.cash + user.bank;

            const embed = new EmbedBuilder()
                .setTitle(`💰 Баланс ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '💵 Кэш', value: `${user.cash} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🏦 Банк', value: `${user.bank} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '💎 Всего', value: `${total} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                )
                .setColor(0x303135)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing balance command:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при получении баланса.', 
                flags: 64 
            });
        }
    }
};

