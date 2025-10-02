const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Deal = require('../models/Deal');
const Item = require('../models/Item');
const Auction = require('../models/Auction');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Показать статистику рынка'),
    
    async execute(interaction) {
        try {
            const [dealStats, activeItems, activeAuctions] = await Promise.all([
                Deal.getStats(),
                Item.findActive('', '', 'created_at', 'DESC', 1000, 0),
                Auction.findActive()
            ]);

            const embed = new EmbedBuilder()
                .setTitle('📊 Статистика рынка')
                .setColor(0x303135)
                .setTimestamp()
                .addFields(
                    { name: '📦 Активных лотов', value: activeItems.length.toString(), inline: true },
                    { name: '🤝 Активных сделок', value: (dealStats.active_deals || 0).toString(), inline: true },
                    { name: '🔨 Активных аукционов', value: activeAuctions.length.toString(), inline: true },
                    { name: '✅ Завершённых сделок', value: (dealStats.completed_deals || 0).toString(), inline: true },
                    { name: '❌ Отменённых сделок', value: (dealStats.canceled_deals || 0).toString(), inline: true },
                    { name: '💰 Общий оборот', value: `${(dealStats.total_volume || 0).toLocaleString()} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting stats:', error);
            await interaction.reply({ content: '❌ Ошибка при получении статистики.', flags: 64 });
        }
    }
};
