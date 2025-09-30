const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Item = require('../models/Item');
const Deal = require('../models/Deal');
const Auction = require('../models/Auction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Показать статистику рынка'),
    
    async execute(interaction) {
        try {
            const [dealStats, activeItems, activeAuctions] = await Promise.all([
                Deal.getStats(),
                Item.findActive('', '', 'created_at', 'DESC', 1000, 0), // Get count
                Auction.findActive()
            ]);

            const embed = new EmbedBuilder()
                .setTitle('📊 Статистика рынка')
                .setColor(0x0099ff)
                .setTimestamp()
                .addFields(
                    { name: '📦 Активных лотов', value: activeItems.length.toString(), inline: true },
                    { name: '🤝 Активных сделок', value: dealStats.active_deals, inline: true },
                    { name: '🔨 Активных аукционов', value: activeAuctions.length.toString(), inline: true },
                    { name: '✅ Завершенных сделок', value: dealStats.completed_deals, inline: true },
                    { name: '❌ Отмененных сделок', value: dealStats.canceled_deals, inline: true },
                    { name: '💰 Общий оборот', value: `${dealStats.total_volume} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting stats:', error);
            await interaction.reply({ content: '❌ Ошибка при получении статистики.', ephemeral: true });
        }
    }
};
