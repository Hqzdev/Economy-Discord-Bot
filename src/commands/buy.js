const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const Item = require('../models/Item');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Поиск товара - просмотр активных лотов'),
    
    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🔍 Поиск товара')
                .setDescription('Все активные лоты на рынке:')
                .setColor(0x303135)
                .setTimestamp();

            // Получаем все активные лоты из базы данных, отсортированные по названию
            const activeItems = await Item.getSortedItems('title', 'ASC', 50);

            if (activeItems.length === 0) {
                embed.setDescription('📭 Активных лотов не найдено');
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('refresh_market')
                            .setLabel('🔄 Обновить')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({ 
                    embeds: [embed], 
                    components: [row] 
                });
                return;
            }

            // Показываем первые 10 лотов в embed
            activeItems.slice(0, 10).forEach((item, index) => {
                const quantityText = item.quantity > 0 ? `${item.quantity} шт.` : '❌ Нет в наличии';
                embed.addFields({
                    name: `${index + 1}. ${item.title}`,
                    value: `💰 **${item.price}** ${process.env.CURRENCY_NAME || 'золото'} | 📦 ${quantityText} | 👤 <@${item.sellerId}>`,
                    inline: false
                });
            });

            // Создаем select menu для выбора товаров (до 25 элементов)
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('buy_item_select')
                .setPlaceholder('Выберите товар для покупки')
                .setMinValues(1)
                .setMaxValues(1);

            // Фильтруем только товары с количеством > 0
            const availableItems = activeItems.filter(item => item.quantity > 0);
            
            availableItems.slice(0, 25).forEach(item => {
                selectMenu.addOptions({
                    label: item.title.substring(0, 100),
                    description: `${item.price} ${process.env.CURRENCY_NAME || 'золото'} | ${item.quantity} шт.`,
                    value: `item_${item.id}`,
                    emoji: '🛒'
                });
            });

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            
            // Кнопки для навигации
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_market')
                        .setLabel('🔄 Обновить')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('sort_by_price')
                        .setLabel('💰 По цене')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('sort_by_name')
                        .setLabel('📝 По названию')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [row1, row2] 
            });

        } catch (error) {
            console.error('Error showing buy menu:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при загрузке товаров.', 
                flags: 64 
            });
        }
    }
};
