const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Inventory = require('../models/Inventory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Просмотр вашего инвентаря'),
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const inventoryItems = await Inventory.findByUser(userId);

            const embed = new EmbedBuilder()
                .setTitle('🎒 Ваш инвентарь')
                .setColor(0x303135)
                .setTimestamp();

            if (inventoryItems.length === 0) {
                embed.setDescription('📭 Ваш инвентарь пуст.\n\nИспользуйте `/sell` чтобы начать продавать товары из инвентаря.');
            } else {
                embed.setDescription(`У вас ${inventoryItems.length} ${inventoryItems.length === 1 ? 'предмет' : 'предметов'}:`);
                
                inventoryItems.forEach((item, index) => {
                    embed.addFields({
                        name: `${index + 1}. ${item.title}`,
                        value: `📦 **${item.quantity}** шт. | 💰 ${item.price} ${process.env.CURRENCY_NAME || 'золото'} | 📂 ${item.category || 'Без категории'}`,
                        inline: false
                    });
                });
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_inventory')
                        .setLabel('🔄 Обновить')
                        .setStyle(ButtonStyle.Secondary)
                );

            if (inventoryItems.length > 0) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('sell_from_inventory')
                        .setLabel('💰 Продать')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                flags: 64
            });

        } catch (error) {
            console.error('Error showing inventory:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при загрузке инвентаря.', 
                flags: 64 
            });
        }
    }
};
