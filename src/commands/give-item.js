const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const Item = require('../models/Item');
const Inventory = require('../models/Inventory');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-item')
        .setDescription('Выдать товар пользователю (только для админов)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которому выдать товар')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Количество товара для выдачи')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction) {
        try {
            // Check if user is admin
            const user = await User.findByDiscordId(interaction.user.id);
            if (!user || !user.isAdmin()) {
                await interaction.reply({ 
                    content: '❌ У вас нет прав для выдачи товаров. Только администраторы могут выдавать товары.', 
                    flags: 64 
                });
                return;
            }

            const targetUser = interaction.options.getUser('user');
            const quantity = interaction.options.getInteger('quantity');

            // Get all available items
            const items = await Item.findActive('', '', 'title', 'ASC', 100, 0);

            if (items.length === 0) {
                await interaction.reply({ 
                    content: '❌ Нет доступных товаров для выдачи.', 
                    flags: 64 
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎁 Выдача товара')
                .setDescription(`Выберите товар для выдачи пользователю <@${targetUser.id}> (количество: ${quantity}):`)
                .setColor(0x303135)
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`give_item_${targetUser.id}_${quantity}`)
                .setPlaceholder('Выберите товар для выдачи')
                .setMinValues(1)
                .setMaxValues(1);

            items.slice(0, 25).forEach(item => {
                selectMenu.addOptions({
                    label: item.title.substring(0, 100),
                    description: `${item.price} ${process.env.CURRENCY_NAME || 'золото'} | ${item.category || 'Без категории'}`,
                    value: `item_${item.id}`,
                    emoji: '🎁'
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                flags: 64
            });

        } catch (error) {
            console.error('Error showing give item menu:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при загрузке товаров.', 
                flags: 64 
            });
        }
    }
};
