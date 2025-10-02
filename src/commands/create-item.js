const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const Item = require('../models/Item');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-item')
        .setDescription('Создать новый товар (только для админов)'),
    
    async execute(interaction) {
        try {
            // Check if user is admin
            const user = await User.findByDiscordId(interaction.user.id);
            if (!user || !user.isAdmin()) {
                await interaction.reply({ 
                    content: '❌ У вас нет прав для создания товаров. Только администраторы могут создавать товары.', 
                    flags: 64 
                });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId('create_item_modal')
                .setTitle('🏭 Создание товара (Админ)');

            const titleInput = new TextInputBuilder()
                .setCustomId('item_title')
                .setLabel('Название товара')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(200)
                .setPlaceholder('Например: Магический меч +5');

            const descriptionInput = new TextInputBuilder()
                .setCustomId('item_description')
                .setLabel('Описание товара')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder('Подробное описание товара...');

            const priceInput = new TextInputBuilder()
                .setCustomId('item_price')
                .setLabel('Базовая цена товара')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('100');

            const quantityInput = new TextInputBuilder()
                .setCustomId('item_quantity')
                .setLabel('Начальное количество')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue('1')
                .setPlaceholder('1');

            const categoryInput = new TextInputBuilder()
                .setCustomId('item_category')
                .setLabel('Категория товара')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Оружие, Броня, Ресурсы и т.д.');

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descriptionInput),
                new ActionRowBuilder().addComponents(priceInput),
                new ActionRowBuilder().addComponents(quantityInput),
                new ActionRowBuilder().addComponents(categoryInput)
            );

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing create item modal:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при открытии формы создания товара.', 
                flags: 64 
            });
        }
    }
};
