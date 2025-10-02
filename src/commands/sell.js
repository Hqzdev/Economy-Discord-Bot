const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Inventory = require('../models/Inventory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Продать товар из вашего инвентаря'),
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const inventoryItems = await Inventory.findByUser(userId);

            const embed = new EmbedBuilder()
                .setTitle('🏪 Продажа товаров')
                .setColor(0x303135)
                .setTimestamp();

            if (inventoryItems.length === 0) {
                embed.setDescription('📭 Ваш инвентарь пуст.\n\nОбратитесь к администратору, чтобы получить товары для продажи.');
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('refresh_sell_menu')
                            .setLabel('🔄 Обновить')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({ 
                    embeds: [embed], 
                    components: [row],
                    flags: 64
                });
                return;
            }

            embed.setDescription(`Выберите товар из вашего инвентаря для продажи:`);
            
            inventoryItems.forEach((item, index) => {
                embed.addFields({
                    name: `${index + 1}. ${item.title}`,
                    value: `📦 **${item.quantity}** шт. | 💰 Базовая цена: ${item.price} ${process.env.CURRENCY_NAME || 'золото'}`,
                    inline: false
                });
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('sell_item_select')
                .setPlaceholder('Выберите товар для продажи')
                .setMinValues(1)
                .setMaxValues(1);

            inventoryItems.slice(0, 25).forEach(item => {
                selectMenu.addOptions({
                    label: item.title.substring(0, 100),
                    description: `${item.quantity} шт. | ${item.price} ${process.env.CURRENCY_NAME || 'золото'}`,
                    value: `item_${item.itemId}`,
                    emoji: '💰'
                });
            });

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_sell_menu')
                        .setLabel('🔄 Обновить')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('view_inventory')
                        .setLabel('🎒 Инвентарь')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [row1, row2],
                flags: 64
            });

        } catch (error) {
            console.error('Error showing sell menu:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при загрузке инвентаря.', 
                flags: 64 
            });
        }
    }
};
