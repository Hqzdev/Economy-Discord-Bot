const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const memoryStorage = require('../utils/memoryStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('Управление аукционами')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать активные аукционы'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новый аукцион')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Название товара')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('min_bid')
                        .setDescription('Минимальная ставка')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration_hours')
                        .setDescription('Длительность аукциона в часах')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bid')
                .setDescription('Сделать ставку на аукцион')
                .addStringOption(option =>
                    option.setName('auction_id')
                        .setDescription('ID аукциона')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Сумма ставки')
                        .setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'list':
                await handleAuctionList(interaction);
                break;
            case 'create':
                await handleAuctionCreate(interaction);
                break;
            case 'bid':
                await handleAuctionBid(interaction);
                break;
        }
    }
};

async function handleAuctionList(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🔨 Активные аукционы')
        .setDescription('Выберите аукцион для просмотра или ставки:')
        .setColor(0x303135)
        .setTimestamp();

    // Заглушка данных
    const mockAuctions = [
        { 
            id: 1, 
            item: 'Легендарный меч', 
            minBid: 5000, 
            currentBid: 7500, 
            bidder: 'Игрок#1234',
            timeLeft: '2ч 30м',
            seller: 'Торговец#5678'
        },
        { 
            id: 2, 
            item: 'Драконья броня', 
            minBid: 8000, 
            currentBid: 8000, 
            bidder: null,
            timeLeft: '1ч 15м',
            seller: 'Рыцарь#9999'
        },
        { 
            id: 3, 
            item: 'Кольцо силы', 
            minBid: 3000, 
            currentBid: 4500, 
            bidder: 'Маг#1111',
            timeLeft: '45м',
            seller: 'Алхимик#2222'
        }
    ];

    mockAuctions.forEach(auction => {
        const timeLeft = auction.timeLeft;
        const currentBidder = auction.bidder ? `👤 ${auction.bidder}` : '❌ Нет ставок';
        
        embed.addFields({
            name: `🔨 ${auction.item}`,
            value: `💰 **Текущая ставка:** ${auction.currentBid} ${process.env.CURRENCY_NAME || 'золото'}\n⏰ **Осталось:** ${timeLeft}\n${currentBidder}\n👤 **Продавец:** ${auction.seller}`,
            inline: true
        });
    });

    // Select menu для выбора аукциона
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('auction_select')
        .setPlaceholder('Выберите аукцион для ставки')
        .setMinValues(1)
        .setMaxValues(1);

    mockAuctions.forEach(auction => {
        selectMenu.addOptions({
            label: auction.item,
            description: `Текущая ставка: ${auction.currentBid} | Осталось: ${auction.timeLeft}`,
            value: `auction_${auction.id}`,
            emoji: '🔨'
        });
    });

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_auctions')
                .setLabel('🔄 Обновить')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('my_auctions')
                .setLabel('📋 Мои аукционы')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('my_bids')
                .setLabel('💰 Мои ставки')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ 
        embeds: [embed], 
        components: [row1, row2] 
    });
}

async function handleAuctionCreate(interaction) {
    // Проверяем права на создание аукциона
    const auctionRoleId = process.env.AUCTION_ROLE_ID;
    const member = interaction.member;
    
    if (auctionRoleId && !member.roles.cache.has(auctionRoleId)) {
        await interaction.reply({ 
            content: '❌ У вас нет прав для создания аукционов. Требуется специальная роль.', 
            flags: 64 
        });
        return;
    }

    const item = interaction.options.getString('item');
    const minBid = interaction.options.getInteger('min_bid');
    const durationHours = interaction.options.getInteger('duration_hours') || 24;

    // Создаем аукцион в памяти
    const auction = memoryStorage.createAuction(interaction.user.id, item, minBid, durationHours);

    const embed = new EmbedBuilder()
        .setTitle('✅ Аукцион создан!')
        .setDescription(`**Товар:** ${item}`)
        .addFields(
            { name: '💰 Минимальная ставка', value: `${minBid} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
            { name: '⏰ Длительность', value: `${durationHours} часов`, inline: true },
            { name: '👤 Создатель', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🆔 ID аукциона', value: `#${auction.id}`, inline: true },
            { name: '⏰ Окончание', value: `<t:${Math.floor(auction.endTime.getTime() / 1000)}:F>`, inline: false }
        )
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleAuctionBid(interaction) {
    const auctionId = interaction.options.getString('auction_id');
    const amount = interaction.options.getInteger('amount');

    const embed = new EmbedBuilder()
        .setTitle('💰 Ставка сделана!')
        .setDescription(`Ставка на аукцион #${auctionId}`)
        .addFields(
            { name: '💰 Сумма ставки', value: `${amount} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
            { name: '👤 Ставщик', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
