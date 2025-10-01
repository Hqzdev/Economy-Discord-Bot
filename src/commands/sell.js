const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Item = require('../models/Item');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Создать новый лот для продажи'),
    
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('sell_item_modal')
            .setTitle('🏪 Создание лота');

        const titleInput = new TextInputBuilder()
            .setCustomId('item_title')
            .setLabel('Название лота')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(200)
            .setPlaceholder('Например: Магический меч +5');

        const priceInput = new TextInputBuilder()
            .setCustomId('item_price')
            .setLabel('Цена лота')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('1000');

        const quantityInput = new TextInputBuilder()
            .setCustomId('item_quantity')
            .setLabel('Количество')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('1')
            .setPlaceholder('1');

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(quantityInput)
        );

        await interaction.showModal(modal);
    }
};
