const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Открыть главное меню рынка'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🏪 Рынок ролевого проекта')
            .setDescription('Добро пожаловать на рынок! Выберите действие:')
            .setColor(0x00ff00)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('sell_item')
                    .setLabel('💰 Продать')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('buy_items')
                    .setLabel('🛒 Купить')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setCustomId('auctions')
                    .setLabel('🔨 Аукционы')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('deals')
                    .setLabel('📋 Сделки')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
