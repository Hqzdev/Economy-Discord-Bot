const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('./database/connection');
const User = require('./models/User');
const Item = require('./models/Item');
const Deal = require('./models/Deal');
const Auction = require('./models/Auction');
const logger = require('./utils/logger');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Store commands and components
client.commands = new Collection();
client.components = new Collection();

// Bot ready event
client.once('ready', async () => {
    logger.info(`✅ Bot logged in as ${client.user.tag}`);
    logger.info(`🌐 Connected to ${client.guilds.cache.size} guilds`);
    
    // Set bot status
    client.user.setActivity('Рынок ролевого проекта', { type: 'WATCHING' });
    
    // Initialize database connection
    try {
        await db.query('SELECT 1');
        logger.info('✅ Database connection established');
    } catch (error) {
        logger.error('❌ Database connection failed:', error);
    }
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isCommand()) {
            await handleCommand(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        } else if (interaction.isSelectMenu()) {
            await handleSelectMenu(interaction);
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Произошла ошибка при обработке запроса.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Произошла ошибка при обработке запроса.', ephemeral: true });
        }
    }
});

// Handle commands
async function handleCommand(interaction) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);
        await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
    }
}

// Handle button interactions
async function handleButton(interaction) {
    const buttonId = interaction.customId;
    
    switch (buttonId) {
        case 'main_menu':
            await showMainMenu(interaction);
            break;
        case 'sell_item':
            await showSellModal(interaction);
            break;
        case 'buy_items':
            await showBuyMenu(interaction);
            break;
        case 'auctions':
            await showAuctionsMenu(interaction);
            break;
        case 'deals':
            await showDealsMenu(interaction);
            break;
        case 'back_to_main':
            await showMainMenu(interaction);
            break;
        default:
            if (buttonId.startsWith('buy_item_')) {
                const itemId = buttonId.replace('buy_item_', '');
                await handleBuyItem(interaction, itemId);
            } else if (buttonId.startsWith('deal_')) {
                const dealAction = buttonId.split('_')[1];
                const dealId = buttonId.split('_')[2];
                await handleDealAction(interaction, dealAction, dealId);
            }
            break;
    }
}

// Handle modal submissions
async function handleModal(interaction) {
    if (interaction.customId === 'sell_item_modal') {
        await handleSellItem(interaction);
    }
}

// Handle select menu interactions
async function handleSelectMenu(interaction) {
    if (interaction.customId === 'item_filter') {
        await handleItemFilter(interaction);
    }
}

// Main menu
async function showMainMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🏪 Рынок ролевого проекта')
        .setDescription('Добро пожаловать на рынок! Выберите действие:')
        .setColor(0x00ff00)
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('sell_item')
                .setLabel('💰 Продать')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💰'),
            new ButtonBuilder()
                .setCustomId('buy_items')
                .setLabel('🛒 Купить')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🛒'),
            new ButtonBuilder()
                .setCustomId('auctions')
                .setLabel('🔨 Аукционы')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔨'),
            new ButtonBuilder()
                .setCustomId('deals')
                .setLabel('📋 Сделки')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋')
        );

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row] });
    }
}

// Show sell modal
async function showSellModal(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
    
    const modal = new ModalBuilder()
        .setCustomId('sell_item_modal')
        .setTitle('Создание лота');

    const titleInput = new TextInputBuilder()
        .setCustomId('item_title')
        .setLabel('Название товара')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('item_description')
        .setLabel('Описание (необязательно)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1000);

    const priceInput = new TextInputBuilder()
        .setCustomId('item_price')
        .setLabel('Цена')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('100');

    const quantityInput = new TextInputBuilder()
        .setCustomId('item_quantity')
        .setLabel('Количество')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue('1');

    const categoryInput = new TextInputBuilder()
        .setCustomId('item_category')
        .setLabel('Категория (необязательно)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(quantityInput),
        new ActionRowBuilder().addComponents(categoryInput)
    );

    await interaction.showModal(modal);
}

// Handle sell item
async function handleSellItem(interaction) {
    const title = interaction.fields.getTextInputValue('item_title');
    const description = interaction.fields.getTextInputValue('item_description') || null;
    const price = parseFloat(interaction.fields.getTextInputValue('item_price'));
    const quantity = parseInt(interaction.fields.getTextInputValue('item_quantity'));
    const category = interaction.fields.getTextInputValue('item_category') || null;

    // Validation
    if (!title || price <= 0 || quantity < 1) {
        await interaction.reply({ content: '❌ Неверные данные. Проверьте заполнение полей.', ephemeral: true });
        return;
    }

    try {
        // Check user's active lots limit
        const activeLots = await Item.countActiveBySeller(interaction.user.id);
        const maxLots = parseInt(process.env.MAX_ACTIVE_LOTS_PER_USER) || 10;
        
        if (activeLots >= maxLots) {
            await interaction.reply({ 
                content: `❌ Превышен лимит активных лотов (${maxLots}). Закройте существующие лоты перед созданием новых.`, 
                ephemeral: true 
            });
            return;
        }

        // Create or update user
        await User.create(interaction.user.id, interaction.user.username, []);
        
        // Create item
        const item = await Item.create(
            interaction.user.id,
            title,
            description,
            price,
            quantity,
            category
        );

        const embed = new EmbedBuilder()
            .setTitle('✅ Лот создан успешно!')
            .setDescription(`**${title}**`)
            .addFields(
                { name: '💰 Цена', value: `${price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: quantity.toString(), inline: true },
                { name: '🏷️ Категория', value: category || 'Не указана', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        if (description) {
            embed.addFields({ name: '📝 Описание', value: description });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
        
        // Log the action
        logger.info(`User ${interaction.user.username} created item: ${title} (ID: ${item.id})`);
        
    } catch (error) {
        logger.error('Error creating item:', error);
        await interaction.reply({ content: '❌ Ошибка при создании лота.', ephemeral: true });
    }
}

// Show buy menu
async function showBuyMenu(interaction) {
    try {
        const items = await Item.findActive('', '', 'created_at', 'DESC', 10, 0);
        const categories = await Item.getCategories();
        
        const embed = new EmbedBuilder()
            .setTitle('🛒 Покупка товаров')
            .setDescription('Выберите товар для покупки:')
            .setColor(0x0099ff)
            .setTimestamp();

        if (items.length === 0) {
            embed.setDescription('📭 Активных лотов не найдено');
        } else {
            items.forEach((item, index) => {
                embed.addFields({
                    name: `${index + 1}. ${item.title}`,
                    value: `💰 ${item.price} ${process.env.CURRENCY_NAME || 'золото'} | 📦 ${item.quantity} шт. | 👤 ${item.sellerId}`,
                    inline: false
                });
            });
        }

        const row = new ActionRowBuilder();
        items.forEach((item, index) => {
            if (index < 5) { // Limit to 5 buttons
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`buy_item_${item.id}`)
                        .setLabel(`${index + 1}. ${item.title.substring(0, 20)}...`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
        });

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 Назад')
                    .setStyle(ButtonStyle.Secondary)
            );

        const components = [row, backButton];
        if (items.length === 0) components.shift(); // Remove empty row

        await interaction.reply({ embeds: [embed], components, ephemeral: true });
        
    } catch (error) {
        logger.error('Error showing buy menu:', error);
        await interaction.reply({ content: '❌ Ошибка при загрузке товаров.', ephemeral: true });
    }
}

// Handle buy item
async function handleBuyItem(interaction, itemId) {
    try {
        const item = await Item.findById(itemId);
        if (!item || item.status !== 'active') {
            await interaction.reply({ content: '❌ Товар не найден или недоступен.', ephemeral: true });
            return;
        }

        if (item.sellerId === interaction.user.id) {
            await interaction.reply({ content: '❌ Нельзя купить собственный товар.', ephemeral: true });
            return;
        }

        // Create deal
        const deal = await Deal.create(item.id, interaction.user.id, item.sellerId, item.price, 1);
        
        // Create private channel for the deal
        const channelName = `deal-${deal.id}`;
        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: 0, // Text channel
            parent: interaction.channel.parentId,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages']
                },
                {
                    id: item.sellerId,
                    allow: ['ViewChannel', 'SendMessages']
                }
            ]
        });

        // Update deal with channel ID
        await deal.updateChannel(channel.id);

        // Send deal information to the channel
        const dealEmbed = new EmbedBuilder()
            .setTitle('🤝 Новая сделка')
            .setDescription(`**Товар:** ${item.title}`)
            .addFields(
                { name: '💰 Цена', value: `${item.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: '1', inline: true },
                { name: '👤 Продавец', value: `<@${item.sellerId}>`, inline: true },
                { name: '🛒 Покупатель', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        if (item.description) {
            dealEmbed.addFields({ name: '📝 Описание', value: item.description });
        }

        const dealRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`deal_confirm_${deal.id}`)
                    .setLabel('✅ Подтвердить')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deal_cancel_${deal.id}`)
                    .setLabel('❌ Отменить')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`deal_complete_${deal.id}`)
                    .setLabel('🏁 Завершить')
                    .setStyle(ButtonStyle.Primary)
            );

        await channel.send({ 
            content: `<@${item.sellerId}> <@${interaction.user.id}>`, 
            embeds: [dealEmbed], 
            components: [dealRow] 
        });

        await interaction.reply({ 
            content: `✅ Сделка создана! Перейдите в канал ${channel} для завершения.`, 
            ephemeral: true 
        });

        logger.info(`Deal created: ${deal.id} for item ${item.id} between ${item.sellerId} and ${interaction.user.id}`);
        
    } catch (error) {
        logger.error('Error handling buy item:', error);
        await interaction.reply({ content: '❌ Ошибка при создании сделки.', ephemeral: true });
    }
}

// Handle deal actions
async function handleDealAction(interaction, action, dealId) {
    try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
            await interaction.reply({ content: '❌ Сделка не найдена.', ephemeral: true });
            return;
        }

        // Check if user is part of the deal
        if (deal.buyerId !== interaction.user.id && deal.sellerId !== interaction.user.id) {
            await interaction.reply({ content: '❌ У вас нет прав для выполнения этого действия.', ephemeral: true });
            return;
        }

        switch (action) {
            case 'confirm':
                await deal.updateStatus('active', 'Подтверждено участником');
                await interaction.reply({ content: '✅ Сделка подтверждена!', ephemeral: true });
                break;
            case 'cancel':
                await deal.updateStatus('canceled', 'Отменено участником');
                await interaction.reply({ content: '❌ Сделка отменена.', ephemeral: true });
                break;
            case 'complete':
                await deal.updateStatus('completed', 'Завершено участником');
                
                // Update item quantity
                const item = await Item.findById(deal.itemId);
                await item.decreaseQuantity(deal.quantity);
                
                // Check if item should be closed
                if (item.quantity <= 0) {
                    await item.updateStatus('sold');
                }
                
                await interaction.reply({ content: '🏁 Сделка завершена!', ephemeral: true });
                break;
        }

        // Update the deal message
        const updatedEmbed = new EmbedBuilder()
            .setTitle('🤝 Сделка обновлена')
            .setDescription(`**Статус:** ${deal.status}`)
            .setColor(deal.status === 'completed' ? 0x00ff00 : deal.status === 'canceled' ? 0xff0000 : 0x0099ff)
            .setTimestamp();

        await interaction.message.edit({ embeds: [updatedEmbed] });
        
    } catch (error) {
        logger.error('Error handling deal action:', error);
        await interaction.reply({ content: '❌ Ошибка при обработке действия.', ephemeral: true });
    }
}

// Show auctions menu
async function showAuctionsMenu(interaction) {
    try {
        const activeAuctions = await Auction.findActive();
        
        const embed = new EmbedBuilder()
            .setTitle('🔨 Аукционы')
            .setDescription('Активные аукционы:')
            .setColor(0xff9900)
            .setTimestamp();

        if (activeAuctions.length === 0) {
            embed.setDescription('📭 Активных аукционов нет');
        } else {
            activeAuctions.forEach((auctionData, index) => {
                const auction = auctionData.auction;
                const timeRemaining = auction.getTimeRemaining();
                const timeStr = timeRemaining ? 
                    `${timeRemaining.days}д ${timeRemaining.hours}ч ${timeRemaining.minutes}м` : 
                    'Завершен';
                
                embed.addFields({
                    name: `${index + 1}. ${auctionData.item.title}`,
                    value: `💰 Мин. ставка: ${auction.minBid} | ⏰ Осталось: ${timeStr}`,
                    inline: false
                });
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 Назад')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        
    } catch (error) {
        logger.error('Error showing auctions menu:', error);
        await interaction.reply({ content: '❌ Ошибка при загрузке аукционов.', ephemeral: true });
    }
}

// Show deals menu
async function showDealsMenu(interaction) {
    try {
        const activeDeals = await Deal.findActiveByUser(interaction.user.id);
        const dealHistory = await Deal.findHistoryByUser(interaction.user.id, 5, 0);
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Ваши сделки')
            .setColor(0x9932cc)
            .setTimestamp();

        if (activeDeals.length > 0) {
            embed.addFields({
                name: '🔄 Активные сделки',
                value: activeDeals.map(dealData => 
                    `**${dealData.item.title}** - ${dealData.deal.status}`
                ).join('\n') || 'Нет активных сделок'
            });
        }

        if (dealHistory.length > 0) {
            embed.addFields({
                name: '📜 История сделок',
                value: dealHistory.slice(0, 5).map(dealData => 
                    `**${dealData.item.title}** - ${dealData.deal.status} (${dealData.deal.price} ${process.env.CURRENCY_NAME || 'золото'})`
                ).join('\n')
            });
        }

        if (activeDeals.length === 0 && dealHistory.length === 0) {
            embed.setDescription('📭 У вас нет сделок');
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 Назад')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        
    } catch (error) {
        logger.error('Error showing deals menu:', error);
        await interaction.reply({ content: '❌ Ошибка при загрузке сделок.', ephemeral: true });
    }
}

// Error handling
client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Login
client.login(process.env.DISCORD_TOKEN);
