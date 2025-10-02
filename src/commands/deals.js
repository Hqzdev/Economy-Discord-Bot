const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const memoryStorage = require('../utils/memoryStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deals')
        .setDescription('Управление сделками'),
    
    async execute(interaction) {
        await handleDealsMenu(interaction);
    }
};

async function handleDealsMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('📋 Сделки')
        .setDescription('Выберите тип сделок для просмотра:')
        .setColor(0x303135)
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('deals_active')
                .setLabel('🔄 Активные сделки')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('deals_history')
                .setLabel('📜 История сделок')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ 
        embeds: [embed], 
        components: [row] 
    });
}

async function handleActiveDeals(interaction) {
    const userId = interaction.user.id;
    const activeDeals = memoryStorage.getActiveUserDeals(userId);

    const embed = new EmbedBuilder()
        .setTitle('🔄 Активные сделки')
        .setColor(0x303135)
        .setTimestamp();

    if (activeDeals.length === 0) {
        embed.setDescription('📭 У вас нет активных сделок');
    } else {
        embed.setDescription('Ваши активные сделки:');
        
        activeDeals.forEach(deal => {
            const role = deal.buyerId === userId ? 'Покупатель' : 'Продавец';
            const partner = deal.buyerId === userId ? deal.sellerId : deal.buyerId;
            const statusEmoji = deal.status === 'active' ? '✅' : '⏳';
            
            embed.addFields({
                name: `${statusEmoji} ${deal.item.title}`,
                value: `💰 **${deal.price}** ${process.env.CURRENCY_NAME || 'золото'} | ${role} | 👤 <@${partner}>\n📅 Создана: <t:${Math.floor(deal.createdAt.getTime() / 1000)}:R>`,
                inline: false
            });
        });
    }

    // Select menu для выбора сделки
    if (activeDeals.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('active_deal_select')
            .setPlaceholder('Выберите сделку для управления')
            .setMinValues(1)
            .setMaxValues(1);

        activeDeals.forEach(deal => {
            const role = deal.buyerId === userId ? 'Покупатель' : 'Продавец';
            selectMenu.addOptions({
                label: deal.item.title,
                description: `${deal.price} ${process.env.CURRENCY_NAME || 'золото'} | ${role}`,
                value: `deal_${deal.id}`,
                emoji: '🤝'
            });
        });

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('deals_menu')
                    .setLabel('🔙 Назад')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ 
            embeds: [embed], 
            components: [row1, row2] 
        });
    } else {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('deals_menu')
                    .setLabel('🔙 Назад')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ 
            embeds: [embed], 
            components: [row] 
        });
    }
}

async function handleDealsHistory(interaction) {
    const userId = interaction.user.id;
    const completedDeals = memoryStorage.getCompletedUserDeals(userId);

    const embed = new EmbedBuilder()
        .setTitle('📜 История сделок')
        .setDescription('Завершенные и отмененные сделки:')
        .setColor(0x303135)
        .setTimestamp();

    if (completedDeals.length === 0) {
        embed.setDescription('📭 У вас нет завершенных сделок');
    } else {
        // Показываем последние 10 сделок
        completedDeals.slice(0, 10).forEach(deal => {
            const role = deal.buyerId === userId ? 'Покупатель' : 'Продавец';
            const partner = deal.buyerId === userId ? deal.sellerId : deal.buyerId;
            const statusEmoji = deal.status === 'completed' ? '✅' : '❌';
            const statusText = deal.status === 'completed' ? 'Завершена' : 'Отменена';
            
            embed.addFields({
                name: `${statusEmoji} ${deal.item.title} - ${statusText}`,
                value: `💰 **${deal.price}** ${process.env.CURRENCY_NAME || 'золото'} | ${role} | 👤 <@${partner}>\n📅 <t:${Math.floor(deal.updatedAt.getTime() / 1000)}:R>`,
                inline: false
            });
        });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('deals_menu')
                .setLabel('🔙 Назад')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [embed], 
        components: [row] 
    });
}

async function handleDealDetails(interaction, dealId) {
    const deal = memoryStorage.deals.get(parseInt(dealId));
    
    if (!deal) {
        await interaction.reply({ content: '❌ Сделка не найдена.', flags: 64 });
        return;
    }

    const userId = interaction.user.id;
    const isParticipant = deal.buyerId === userId || deal.sellerId === userId;
    
    if (!isParticipant) {
        await interaction.reply({ content: '❌ У вас нет прав для просмотра этой сделки.', flags: 64 });
        return;
    }

    const role = deal.buyerId === userId ? 'Покупатель' : 'Продавец';
    const partner = deal.buyerId === userId ? deal.sellerId : deal.buyerId;
    const statusEmoji = deal.status === 'active' ? '✅' : deal.status === 'completed' ? '🏁' : '❌';
    const statusText = deal.status === 'active' ? 'Активная' : 
                      deal.status === 'completed' ? 'Завершена' : 'Отменена';

    const embed = new EmbedBuilder()
        .setTitle(`📋 Сделка #${deal.id}`)
        .setDescription(`**${deal.item.title}**`)
        .addFields(
            { name: '💰 Цена', value: `${deal.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
            { name: '📦 Количество', value: deal.quantity.toString(), inline: true },
            { name: '📊 Статус', value: `${statusEmoji} ${statusText}`, inline: true },
            { name: '👤 Продавец', value: `<@${deal.sellerId}>`, inline: true },
            { name: '🛒 Покупатель', value: `<@${deal.buyerId}>`, inline: true },
            { name: '🎭 Ваша роль', value: role, inline: true },
            { name: '📅 Создана', value: `<t:${Math.floor(deal.createdAt.getTime() / 1000)}:F>`, inline: false }
        )
        .setColor(deal.status === 'completed' ? 0x00ff00 : deal.status === 'canceled' ? 0xff0000 : 0x9932cc)
        .setTimestamp();

    if (deal.item.description) {
        embed.addFields({ name: '📝 Описание', value: deal.item.description, inline: false });
    }

    const buttons = [];
    
    if (deal.status === 'pending' || deal.status === 'active') {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`deal_confirm_${deal.id}`)
                .setLabel('✅ Подтвердить')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`deal_cancel_${deal.id}`)
                .setLabel('❌ Отменить')
                .setStyle(ButtonStyle.Danger)
        );
        
        if (deal.status === 'active') {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`deal_complete_${deal.id}`)
                    .setLabel('🏁 Завершить')
                    .setStyle(ButtonStyle.Primary)
            );
        }
    }

    buttons.push(
        new ButtonBuilder()
            .setCustomId('deals_active')
            .setLabel('🔙 Назад')
            .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.reply({ 
        embeds: [embed], 
        components: [row],
        flags: 64
    });
}

// Экспортируем функции для использования в index.js
module.exports.handleDealsMenu = handleDealsMenu;
module.exports.handleActiveDeals = handleActiveDeals;
module.exports.handleDealsHistory = handleDealsHistory;
module.exports.handleDealDetails = handleDealDetails;