const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { dbAdapter: db } = require('./database/dbAdapter');
const User = require('./models/User');
const Item = require('./models/Item');
const Deal = require('./models/Deal');
const Auction = require('./models/Auction');
const logger = require('./utils/logger');
const { safeReply } = require('./utils/interactionHelper');
const ChannelCleanupService = require('./services/channelCleanup');
const fs = require('fs');
const path = require('path');
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

// Initialize channel cleanup service
let channelCleanup;

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`✅ Loaded command: ${command.data.name}`);
    } else {
        logger.warn(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Bot ready event
client.once('ready', async () => {
    logger.info(`✅ Bot logged in as ${client.user.tag}`);
    logger.info(`🌐 Connected to ${client.guilds.cache.size} guilds`);
    
    // Set bot status
    client.user.setActivity('Рынок ролевого проекта', { type: 'WATCHING' });
    
    // Initialize channel cleanup service
    channelCleanup = new ChannelCleanupService(client);
    logger.info('✅ Channel cleanup service initialized');
    
    // Initialize database connection
    try {
        await db.query('SELECT 1');
        logger.info('✅ Database connection established');
    } catch (error) {
        logger.error('❌ Database connection failed:', error);
    }
});

// Handle messages in deal channels to reset inactivity timer
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if this is a deal channel
    if (message.channel.name && message.channel.name.startsWith('deal-')) {
        if (channelCleanup) {
            channelCleanup.resetTimer(message.channel.id);
            logger.info(`Reset timer for deal channel ${message.channel.id} due to message activity`);
        }
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
        } else if (interaction.isAnySelectMenu()) {
            await handleSelectMenu(interaction);
        }
    } catch (error) {
        logger.error('Error handling interaction:', error);
        await safeReply(interaction, { content: 'Произошла ошибка при обработке запроса.', flags: 64 });
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
        await safeReply(interaction, { content: 'Произошла ошибка при выполнении команды.', flags: 64 });
    }
}

// Handle button interactions
async function handleButton(interaction) {
    const buttonId = interaction.customId;
    
    let modalShown = false;
    try {
        switch (buttonId) {
            case 'main_menu':
            case 'back_to_main':
                await showMainMenu(interaction);
                break;
            case 'sell_item':
                await showSellModal(interaction);
                modalShown = true; // Modal shown, don't reply in catch
                break;
            case 'buy_items':
                await showBuyMenu(interaction);
                break;
            case 'auctions':
                await showAuctionsMenu(interaction);
                break;
            case 'deals':
                const { handleDealsMenu } = require('./commands/deals');
                await handleDealsMenu(interaction);
                break;
            case 'deals_active':
                const { handleActiveDeals } = require('./commands/deals');
                await handleActiveDeals(interaction);
                break;
            case 'deals_history':
                const { handleDealsHistory } = require('./commands/deals');
                await handleDealsHistory(interaction);
                break;
            case 'deals_menu':
                const { handleDealsMenu: handleDealsMenuBack } = require('./commands/deals');
                await handleDealsMenuBack(interaction);
                break;
            case 'refresh_market':
                await refreshMarket(interaction);
                break;
            case 'sort_by_price':
                await sortItems(interaction, 'price');
                break;
            case 'sort_by_name':
                await sortItems(interaction, 'title');
                break;
            case 'refresh_inventory':
                await refreshInventory(interaction);
                break;
            case 'sell_from_inventory':
                await showSellFromInventory(interaction);
                break;
            case 'refresh_sell_menu':
                await refreshSellMenu(interaction);
                break;
            case 'view_inventory':
                await showInventory(interaction);
                break;
            default:
                if (buttonId.startsWith('buy_item_')) {
                    const itemId = buttonId.replace('buy_item_', '');
                    await handleBuyItem(interaction, itemId);
                } else if (buttonId.startsWith('deal_')) {
                    const dealAction = buttonId.split('_')[1];
                    const dealId = buttonId.split('_')[2];
                    await handleDealAction(interaction, dealAction, dealId);
                } else if (buttonId.startsWith('filter_')) {
                    const category = buttonId.replace('filter_', '');
                    await filterItems(interaction, category);
                } else if (buttonId.startsWith('profile_')) {
                    const action = buttonId.replace('profile_', '');
                    await handleProfileAction(interaction, action);
                }
                break;
        }
    } catch (error) {
        logger.error('Error handling button interaction:', error);
        // Don't reply if modal was shown (it's already acknowledged)
        if (!modalShown) {
            await safeReply(interaction, { content: '❌ Ошибка при обработке кнопки.', flags: 64 });
        }
    }
}

// Handle modal submissions
async function handleModal(interaction) {
    if (interaction.customId === 'sell_item_modal') {
        await handleSellItem(interaction);
    } else if (interaction.customId === 'profile_settings_modal') {
        await handleProfileSettingsSave(interaction);
    } else if (interaction.customId === 'create_item_modal') {
        await handleCreateItem(interaction);
    } else if (interaction.customId.startsWith('sell_inventory_modal_')) {
        const itemId = interaction.customId.replace('sell_inventory_modal_', '');
        await handleSellInventoryModal(interaction, itemId);
    }
}

async function handleProfileSettingsSave(interaction) {
    try {
        const bio = interaction.fields.getTextInputValue('profile_bio') || '';
        const location = interaction.fields.getTextInputValue('profile_location') || '';

        // В будущем можно сохранить в БД
        // Пока просто подтверждаем
        const embed = new EmbedBuilder()
            .setTitle('✅ Настройки сохранены')
            .setDescription('Ваши настройки профиля обновлены!')
            .addFields(
                { name: '📝 О себе', value: bio || 'Не указано', inline: false },
                { name: '📍 Местоположение', value: location || 'Не указано', inline: false }
            )
            .setColor(0x303135)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (error) {
        logger.error('Error saving profile settings:', error);
        await safeReply(interaction, { content: '❌ Ошибка при сохранении настроек.', flags: 64 });
    }
}

async function handleCreateItem(interaction) {
    try {
        const title = interaction.fields.getTextInputValue('item_title');
        const description = interaction.fields.getTextInputValue('item_description');
        const price = parseFloat(interaction.fields.getTextInputValue('item_price'));
        const quantity = parseInt(interaction.fields.getTextInputValue('item_quantity'));
        const category = interaction.fields.getTextInputValue('item_category');

        if (isNaN(price) || price <= 0) {
            await interaction.reply({ content: '❌ Неверная цена товара.', flags: 64 });
            return;
        }

        if (isNaN(quantity) || quantity <= 0) {
            await interaction.reply({ content: '❌ Неверное количество товара.', flags: 64 });
            return;
        }

        // Create item with admin as seller (system item)
        const item = await Item.create(interaction.user.id, title, description, price, quantity, category);

        const embed = new EmbedBuilder()
            .setTitle('✅ Товар создан')
            .setDescription(`**${item.title}** успешно добавлен в систему!`)
            .addFields(
                { name: '💰 Цена', value: `${item.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: `${item.quantity}`, inline: true },
                { name: '📂 Категория', value: item.category || 'Без категории', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });

        logger.info(`Admin ${interaction.user.id} created item: ${item.title} (ID: ${item.id})`);

    } catch (error) {
        logger.error('Error creating item:', error);
        await safeReply(interaction, { content: '❌ Ошибка при создании товара.', flags: 64 });
    }
}

// Handle sell item from modal
// Handle select menu interactions
async function handleSelectMenu(interaction) {
    const selectId = interaction.customId;
    
    try {
        switch (selectId) {
            case 'buy_item_select':
                const selectedItem = interaction.values[0];
                const itemId = selectedItem.replace('item_', '');
                await handleBuyItem(interaction, itemId);
                break;
            case 'auction_select':
                const selectedAuction = interaction.values[0];
                const auctionId = selectedAuction.replace('auction_', '');
                await showAuctionDetails(interaction, auctionId);
                break;
            case 'deal_select':
                const selectedDeal = interaction.values[0];
                const dealId = selectedDeal.replace('deal_', '');
                const { handleDealDetails } = require('./commands/deals');
                await handleDealDetails(interaction, dealId);
                break;
            case 'active_deal_select':
                const selectedActiveDeal = interaction.values[0];
                const activeDealId = selectedActiveDeal.replace('deal_', '');
                const { handleDealDetails: handleActiveDealDetails } = require('./commands/deals');
                await handleActiveDealDetails(interaction, activeDealId);
                break;
            case 'item_filter':
                await handleItemFilter(interaction);
                break;
            case 'sell_item_select':
                const selectedSellItem = interaction.values[0];
                const sellItemId = selectedSellItem.replace('item_', '');
                await handleSellItemFromInventory(interaction, sellItemId);
                break;
            default:
                if (selectId.startsWith('give_item_')) {
                    const parts = selectId.split('_');
                    const targetUserId = parts[2];
                    const quantity = parseInt(parts[3]);
                    const selectedItem = interaction.values[0];
                    const itemId = selectedItem.replace('item_', '');
                    await handleGiveItem(interaction, targetUserId, itemId, quantity);
                } else {
                    logger.warn(`Unknown select menu ID: ${selectId}`);
                    await interaction.reply({ content: '❌ Неизвестная команда.', flags: 64 });
                }
                break;
        }
    } catch (error) {
        logger.error('Error handling select menu interaction:', error);
        await safeReply(interaction, { content: '❌ Ошибка при обработке выбора.', flags: 64 });
    }
}

// Main menu
async function showMainMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🏪 Рынок ролевого проекта')
        .setDescription('Добро пожаловать на рынок! Выберите действие:')
        .setColor(0x303135)
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
    const category = interaction.fields.getTextInputValue('item_category') || null

    // Validation
    if (!title || price <= 0 || quantity < 1) {
        await interaction.reply({ content: '❌ Неверные данные. Проверьте заполнение полей.', flags: 64 });
        return;
    }

    try {
        // Check user's active lots limit
        const activeLots = await Item.countActiveBySeller(interaction.user.id);
        const maxLots = parseInt(process.env.MAX_ACTIVE_LOTS_PER_USER) || 10;
        
        if (activeLots >= maxLots) {
            await interaction.reply({ 
                content: `❌ Превышен лимит активных лотов (${maxLots}). Закройте существующие лоты перед созданием новых.`, 
                flags: 64 
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
            .setColor(0x303135)
            .setTimestamp();

        if (description) {
            embed.addFields({ name: '📝 Описание', value: description });
        }

        await interaction.reply({ embeds: [embed], flags: 64 });
        
        // Log the action
        logger.info(`User ${interaction.user.username} created item: ${title} (ID: ${item.id})`);
        
    } catch (error) {
        logger.error('Error creating item:', error);
        await safeReply(interaction, { content: '❌ Ошибка при создании лота.', flags: 64 });
    }
}

// Show buy menu
async function showBuyMenu(interaction) {
    try {
        // Defer reply to avoid timeout
        if (interaction.isButton()) {
            await interaction.deferUpdate();
        }
        
        const { embed, components } = await showBuyMenuContent(interaction);

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed], components });
        } else {
            await interaction.reply({ embeds: [embed], components, flags: 64 });
        }
        
    } catch (error) {
        logger.error('Error showing buy menu:', error);
        await safeReply(interaction, { content: '❌ Ошибка при загрузке товаров.', flags: 64 });
    }
}

// Handle buy item
async function handleBuyItem(interaction, itemId) {
    try {
        // Defer reply immediately to avoid timeout
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: 64 });
        }
        
        const item = await Item.findById(itemId);
        if (!item || item.status !== 'active') {
            await interaction.editReply({ content: '❌ Товар не найден или недоступен.' });
            return;
        }

        if (item.sellerId === interaction.user.id) {
            await interaction.editReply({ content: '❌ Нельзя купить собственный товар.' });
            return;
        }

        // Create private channel for the deal
        const channelName = `deal-${Date.now()}`;
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

        // Create deal in database - покупатель может купить только 1 единицу товара
        const deal = await Deal.create(item.id, interaction.user.id, item.sellerId, item.price, 1, channel.id);

        // Send deal information to the channel
        const dealEmbed = new EmbedBuilder()
            .setTitle('🤝 Новая сделка')
            .setDescription(`**Товар:** ${item.title}\n\n**Только покупатель может подтвердить покупку!**`)
            .addFields(
                { name: '💰 Цена', value: `${item.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: '1', inline: true },
                { name: '👤 Продавец', value: `<@${item.sellerId}>`, inline: true },
                { name: '🛒 Покупатель', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🆔 ID сделки', value: `#${deal.id}`, inline: true }
            )
            .setColor(0x303135)
            .setTimestamp();

        const dealRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`deal_confirm_${deal.id}`)
                    .setLabel('✅ Подтвердить покупку')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deal_cancel_${deal.id}`)
                    .setLabel('❌ Отменить')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ 
            content: `<@${item.sellerId}> <@${interaction.user.id}>`, 
            embeds: [dealEmbed], 
            components: [dealRow] 
        });
        
        // Start inactivity timer for the channel (1 minute)
        if (channelCleanup) {
            channelCleanup.startInactivityTimer(channel.id);
        }

        await interaction.editReply({ 
            content: `✅ Сделка создана! Перейдите в канал ${channel} для завершения.\n⏰ Канал будет удалён через 1 минуту без активности.`
        });

        logger.info(`Deal created: ${deal.id} for item ${item.id} between ${item.sellerId} and ${interaction.user.id}`);
        
    } catch (error) {
        logger.error('Error handling buy item:', error);
        await safeReply(interaction, { content: '❌ Ошибка при создании сделки.', flags: 64 });
    }
}

// Handle deal actions
async function handleDealAction(interaction, action, dealId) {
    try {
        const deal = await Deal.findById(dealId);
        if (!deal) {
            await interaction.reply({ content: '❌ Сделка не найдена.', flags: 64 });
            return;
        }

        // Check if user is part of the deal
        if (deal.buyerId !== interaction.user.id && deal.sellerId !== interaction.user.id) {
            await interaction.reply({ content: '❌ У вас нет прав для выполнения этого действия.', flags: 64 });
            return;
        }

        switch (action) {
            case 'confirm':
                // Only buyer can confirm the purchase
                if (deal.buyerId !== interaction.user.id) {
                    await interaction.reply({ content: '❌ Только покупатель может подтвердить покупку.', flags: 64 });
                    return;
                }
                
                await deal.updateStatus('confirmed', 'Подтверждено покупателем');
                // Reset inactivity timer on activity
                if (channelCleanup && deal.channelId) {
                    channelCleanup.resetTimer(deal.channelId);
                }
                
                // Process the purchase immediately after confirmation
                try {
                    // Get buyer and seller
                    const buyer = await User.findByDiscordId(deal.buyerId);
                    const seller = await User.findByDiscordId(deal.sellerId);
                    
                    if (buyer && seller) {
                        // Check if buyer has enough cash
                        if (buyer.cash >= deal.price) {
                            // Transfer money: buyer -> seller
                            await buyer.addCash(-deal.price);
                            await seller.addCash(deal.price);
                            logger.info(`Balance transfer: ${deal.buyerId} paid ${deal.price} to ${deal.sellerId}`);
                            
                            // Update item quantity in database and add to buyer's inventory
                            const item = await Item.findById(deal.itemId);
                            if (item && item.quantity > 0) {
                                try {
                                    await item.decreaseQuantity(deal.quantity);
                                    
                                    // Add item to buyer's inventory
                                    const Inventory = require('./models/Inventory');
                                    await Inventory.create(deal.buyerId, item.id, deal.quantity);
                                    
                                    // Check if item is sold out after purchase
                                    const updatedItem = await Item.findById(deal.itemId);
                                    if (updatedItem.quantity <= 0) {
                                        await item.updateStatus('sold');
                                        logger.info(`Item ${item.id} sold out and marked as sold`);
                                    }
                                } catch (error) {
                                    logger.error('Error decreasing quantity:', error);
                                    // If quantity is insufficient, still complete the deal but log the issue
                                    logger.warn(`Insufficient quantity for item ${item.id}, but deal completed`);
                                }
                            }
                            
                            await interaction.reply({ content: '✅ Покупка подтверждена! Деньги переведены. Канал будет удалён через 5 секунд.', flags: 64 });
                            // Schedule channel deletion after 5 seconds
                            if (channelCleanup && deal.channelId) {
                                channelCleanup.scheduleDelete(deal.channelId, 5000);
                            }
                        } else {
                            await interaction.reply({ content: '❌ Недостаточно средств для покупки.', flags: 64 });
                        }
                    } else {
                        await interaction.reply({ content: '❌ Ошибка: пользователи не найдены.', flags: 64 });
                    }
                } catch (error) {
                    logger.error('Error processing purchase:', error);
                    await interaction.reply({ content: '❌ Ошибка при обработке покупки.', flags: 64 });
                }
                break;
            case 'cancel':
                await deal.updateStatus('canceled', 'Отменено участником');
                await interaction.reply({ content: '❌ Сделка отменена. Канал будет удалён через 5 секунд.', flags: 64 });
                // Schedule channel deletion after 5 seconds
                if (channelCleanup && deal.channelId) {
                    channelCleanup.scheduleDelete(deal.channelId, 5000);
                }
                break;
        }

        // Update the deal message only if not confirmed
        if (action !== 'confirm') {
            const item = await Item.findById(deal.itemId);
            const updatedEmbed = new EmbedBuilder()
                .setTitle('🤝 Сделка обновлена')
                .setDescription(`**Товар:** ${item ? item.title : 'Неизвестно'}`)
                .addFields(
                    { name: '💰 Цена', value: `${deal.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '📊 Статус', value: deal.status, inline: true },
                    { name: '👤 Продавец', value: `<@${deal.sellerId}>`, inline: true },
                    { name: '🛒 Покупатель', value: `<@${deal.buyerId}>`, inline: true }
                )
                .setColor(0x303135)
                .setTimestamp();

            await interaction.message.edit({ embeds: [updatedEmbed] });
        }
        
    } catch (error) {
        logger.error('Error handling deal action:', error);
        await safeReply(interaction, { content: '❌ Ошибка при обработке действия.', flags: 64 });
    }
}

// Show auctions menu
async function showAuctionsMenu(interaction) {
    try {
        // Defer if it's a button interaction
        if (interaction.isButton()) {
            await interaction.deferUpdate();
        }
        
        const activeAuctions = await Auction.findActive();
        
        const embed = new EmbedBuilder()
            .setTitle('🔨 Активные аукционы')
            .setDescription(activeAuctions.length > 0 ? 'Выберите аукцион для просмотра или ставки:' : '📭 Активных аукционов нет')
            .setColor(0x303135)
            .setTimestamp();

        if (activeAuctions.length > 0) {
            for (const auctionData of activeAuctions) {
                const auction = auctionData.auction;
                const timeRemaining = auction.getTimeRemaining();
                const timeStr = timeRemaining ? 
                    `${timeRemaining.hours}ч ${timeRemaining.minutes}м` : 
                    'Завершён';
                
                // Get highest bid
                const highestBid = await auction.getHighestBid();
                const currentBid = highestBid ? highestBid.amount : auction.minBid;
                const bidderInfo = highestBid ? `👤 ${highestBid.bidder_name}` : '❌ Нет ставок';
                
                const value = [
                    `💰 Текущая ставка: ${currentBid} ${process.env.CURRENCY_NAME || 'золото'}`,
                    `⏰ Осталось: ${timeStr}`,
                    `🏆 Высшая ставка: ${highestBid ? `${highestBid.amount} ${process.env.CURRENCY_NAME || 'золото'} от <@${highestBid.bidder_id}>` : 'Нет ставок'}`,
                    `👤 Продавец: <@${auction.createdBy}>`
                ].join('\n');
                
                embed.addFields({
                    name: `🔨 ${auctionData.item.title}`,
                    value: value,
                    inline: false
                });
            }
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('🔙 Назад')
                    .setStyle(ButtonStyle.Secondary)
            );

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed], components: [row] });
        } else {
            await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        }
        
    } catch (error) {
        logger.error('Error showing auctions menu:', error);
        await safeReply(interaction, { content: '❌ Ошибка при загрузке аукционов.', flags: 64 });
    }
}

// Show deals menu
async function showDealsMenu(interaction) {
    try {
        const activeDeals = await Deal.findActiveByUser(interaction.user.id);
        const dealHistory = await Deal.findHistoryByUser(interaction.user.id, 5, 0);
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Ваши сделки')
            .setColor(0x303135)
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

        await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        
    } catch (error) {
        logger.error('Error showing deals menu:', error);
        await safeReply(interaction, { content: '❌ Ошибка при загрузке сделок.', flags: 64 });
    }
}

// Additional handler functions
async function refreshMarket(interaction) {
    await interaction.deferUpdate();
    // Reload buy menu
    await showBuyMenuContent(interaction);
}

async function showBuyMenuContent(interaction) {
    const items = await Item.findActive('', '', 'created_at', 'DESC', 50, 0);
    
    // Фильтруем только товары с количеством > 0
    const availableItems = items.filter(item => item.quantity > 0);
    
    const embed = new EmbedBuilder()
        .setTitle('🛒 Покупка товаров')
        .setDescription(availableItems.length > 0 ? 'Выберите товар для покупки:' : '📭 Активных лотов не найдено')
        .setColor(0x303135)
        .setTimestamp();

    if (availableItems.length > 0) {
        availableItems.slice(0, 10).forEach((item, index) => {
            embed.addFields({
                name: `${index + 1}. ${item.title}`,
                value: `💰 ${item.price} ${process.env.CURRENCY_NAME || 'золото'} | 📦 ${item.quantity} шт. | 👤 <@${item.sellerId}>`,
                inline: false
            });
        });
    }

    const components = [];
    
    if (availableItems.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('buy_item_select')
            .setPlaceholder('Выберите товар для покупки')
            .setMinValues(1)
            .setMaxValues(1);

        availableItems.slice(0, 25).forEach(item => {
            selectMenu.addOptions({
                label: item.title.substring(0, 100),
                description: `${item.price} ${process.env.CURRENCY_NAME || 'золото'} | ${item.quantity} шт.`,
                value: `item_${item.id}`,
                emoji: '🛒'
            });
        });

        components.push(new ActionRowBuilder().addComponents(selectMenu));
        
        // Add sorting buttons
        const sortRow = new ActionRowBuilder()
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
        components.push(sortRow);
    }
    
    // Add back button
    components.push(new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('🔙 Назад')
                .setStyle(ButtonStyle.Secondary)
        ));

    return { embed, components };
}

async function sortItems(interaction, sortBy) {
    await interaction.deferUpdate();
    
    const embed = new EmbedBuilder()
        .setTitle('🔍 Поиск товара')
        .setDescription(`Все активные лоты на рынке (отсортированы по ${sortBy === 'price' ? 'цене' : 'названию'}):`)
        .setColor(0x303135)
        .setTimestamp();

    // Получаем отсортированные лоты
    const sortedItems = await Item.getSortedItems(sortBy, 'ASC', 50);
    
    // Фильтруем только товары с количеством > 0
    const availableItems = sortedItems.filter(item => item.quantity > 0);

    if (availableItems.length === 0) {
        embed.setDescription('📭 Активных лотов не найдено');
    } else {
        availableItems.slice(0, 10).forEach((item, index) => {
            embed.addFields({
                name: `${index + 1}. ${item.title}`,
                value: `💰 **${item.price}** ${process.env.CURRENCY_NAME || 'золото'} | 📦 ${item.quantity} шт. | 👤 <@${item.sellerId}>`,
                inline: false
            });
        });
    }

    // Создаем select menu для выбора товаров
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_item_select')
        .setPlaceholder('Выберите товар для покупки')
        .setMinValues(1)
        .setMaxValues(1);

    availableItems.slice(0, 25).forEach(item => {
        selectMenu.addOptions({
            label: item.title.substring(0, 100),
            description: `${item.price} ${process.env.CURRENCY_NAME || 'золото'} | ${item.quantity} шт.`,
            value: `item_${item.id}`,
            emoji: '🛒'
        });
    });

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    
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

    await interaction.editReply({ 
        embeds: [embed], 
        components: [row1, row2] 
    });
}

async function showMyAuctions(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('📋 Мои аукционы')
        .setDescription('Список ваших созданных аукционов')
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function showMyBids(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('💰 Мои ставки')
        .setDescription('Список ваших ставок на аукционах')
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function showDealHistory(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('📜 История сделок')
        .setDescription('История всех ваших сделок')
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function filterItems(interaction, category) {
    await interaction.deferUpdate();
    // Здесь будет логика фильтрации товаров
    logger.info(`Filtering items by category: ${category}`);
}

async function handleProfileAction(interaction, action) {
    try {
        if (action === 'settings') {
            await showProfileSettings(interaction);
        } else if (action.startsWith('deals_')) {
            const userId = action.replace('deals_', '');
            await showUserDeals(interaction, userId);
        } else {
            logger.info(`Unknown profile action: ${action}`);
        }
    } catch (error) {
        logger.error('Error handling profile action:', error);
        await safeReply(interaction, { content: '❌ Ошибка при обработке действия.', flags: 64 });
    }
}

async function showProfileSettings(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
    
    const modal = new ModalBuilder()
        .setCustomId('profile_settings_modal')
        .setTitle('⚙️ Настройки профиля');

    const bioInput = new TextInputBuilder()
        .setCustomId('profile_bio')
        .setLabel('О себе (Bio)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500)
        .setPlaceholder('Расскажите о себе...');

    const locationInput = new TextInputBuilder()
        .setCustomId('profile_location')
        .setLabel('Местоположение')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(100)
        .setPlaceholder('Город, страна...');

    modal.addComponents(
        new ActionRowBuilder().addComponents(bioInput),
        new ActionRowBuilder().addComponents(locationInput)
    );

    await interaction.showModal(modal);
}

async function showUserDeals(interaction, userId) {
    try {
        const deals = await Deal.findActiveByUser(userId);
        const history = await Deal.findHistoryByUser(userId, 5, 0);

        const embed = new EmbedBuilder()
            .setTitle(`📋 Сделки пользователя`)
            .setColor(0x303135)
            .setTimestamp();

        if (deals.length > 0) {
            const activeDealsText = deals.map(d => 
                `• **${d.item.title}** - ${d.deal.status}`
            ).join('\n');
            embed.addFields({ name: '🔄 Активные', value: activeDealsText || 'Нет' });
        }

        if (history.length > 0) {
            const historyText = history.slice(0, 5).map(d => 
                `• **${d.item.title}** - ${d.deal.status}`
            ).join('\n');
            embed.addFields({ name: '📜 История', value: historyText || 'Нет' });
        }

        if (deals.length === 0 && history.length === 0) {
            embed.setDescription('📭 Сделок не найдено');
        }

        await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (error) {
        logger.error('Error showing user deals:', error);
        await safeReply(interaction, { content: '❌ Ошибка при загрузке сделок.', flags: 64 });
    }
}

async function showAuctionDetails(interaction, auctionId) {
    const embed = new EmbedBuilder()
        .setTitle(`🔨 Детали аукциона #${auctionId}`)
        .setDescription('Подробная информация об аукционе')
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function showDealDetails(interaction, dealId) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 Детали сделки #${dealId}`)
        .setDescription('Подробная информация о сделке')
        .setColor(0x303135)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

// Error handling
client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

// New inventory and sell handlers
async function refreshInventory(interaction) {
    const { execute } = require('./commands/inventory');
    await execute(interaction);
}

async function showInventory(interaction) {
    const { execute } = require('./commands/inventory');
    await execute(interaction);
}

async function refreshSellMenu(interaction) {
    const { execute } = require('./commands/sell');
    await execute(interaction);
}

async function showSellFromInventory(interaction) {
    const { execute } = require('./commands/sell');
    await execute(interaction);
}

async function handleSellItemFromInventory(interaction, itemId) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ flags: 64 });
        }

        const userId = interaction.user.id;
        
        // Check if user has this item in inventory
        const Inventory = require('./models/Inventory');
        const inventoryItem = await Inventory.findByUserAndItem(userId, itemId);
        
        if (!inventoryItem) {
            await interaction.editReply({ content: '❌ У вас нет этого товара в инвентаре.' });
            return;
        }

        // Get item details
        const Item = require('./models/Item');
        const item = await Item.findById(itemId);
        
        if (!item) {
            await interaction.editReply({ content: '❌ Товар не найден.' });
            return;
        }

        // Create modal for selling
        const modal = new ModalBuilder()
            .setCustomId(`sell_inventory_modal_${itemId}`)
            .setTitle('💰 Продажа товара');

        const priceInput = new TextInputBuilder()
            .setCustomId('sell_price')
            .setLabel('Цена продажи')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder(item.price.toString())
            .setValue(item.price.toString());

        const quantityInput = new TextInputBuilder()
            .setCustomId('sell_quantity')
            .setLabel(`Количество (макс: ${inventoryItem.quantity})`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('1')
            .setPlaceholder('1');

        modal.addComponents(
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(quantityInput)
        );

        await interaction.showModal(modal);

    } catch (error) {
        logger.error('Error handling sell from inventory:', error);
        await safeReply(interaction, { content: '❌ Ошибка при обработке продажи.', flags: 64 });
    }
}

async function handleGiveItem(interaction, targetUserId, itemId, quantity) {
    try {
        const Inventory = require('./models/Inventory');
        
        // Give item to user
        await Inventory.create(targetUserId, itemId, quantity);
        
        const Item = require('./models/Item');
        const item = await Item.findById(itemId);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Товар выдан')
            .setDescription(`**${item.title}** (${quantity} шт.) выдан пользователю <@${targetUserId}>`)
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        
        logger.info(`Admin ${interaction.user.id} gave ${quantity}x ${item.title} to user ${targetUserId}`);

    } catch (error) {
        logger.error('Error giving item:', error);
        await safeReply(interaction, { content: '❌ Ошибка при выдаче товара.', flags: 64 });
    }
}

async function handleSellInventoryModal(interaction, itemId) {
    try {
        const sellPrice = parseFloat(interaction.fields.getTextInputValue('sell_price'));
        const sellQuantity = parseInt(interaction.fields.getTextInputValue('sell_quantity'));

        if (isNaN(sellPrice) || sellPrice <= 0) {
            await interaction.reply({ content: '❌ Неверная цена товара.', flags: 64 });
            return;
        }

        if (isNaN(sellQuantity) || sellQuantity <= 0) {
            await interaction.reply({ content: '❌ Неверное количество товара.', flags: 64 });
            return;
        }

        const userId = interaction.user.id;
        const Inventory = require('./models/Inventory');
        const Item = require('./models/Item');
        
        // Check if user has enough items
        const inventoryItem = await Inventory.findByUserAndItem(userId, itemId);
        
        if (!inventoryItem || inventoryItem.quantity < sellQuantity) {
            await interaction.reply({ content: '❌ Недостаточно товара в инвентаре.', flags: 64 });
            return;
        }

        // Get item details
        const item = await Item.findById(itemId);
        
        if (!item) {
            await interaction.reply({ content: '❌ Товар не найден.', flags: 64 });
            return;
        }

        // Create new item for sale (copy of the original item with custom price)
        const newItem = await Item.create(
            userId, 
            item.title, 
            item.description, 
            sellPrice, 
            sellQuantity, 
            item.category, 
            item.imageUrl
        );

        // Remove items from inventory
        await inventoryItem.decreaseQuantity(sellQuantity);

        const embed = new EmbedBuilder()
            .setTitle('✅ Товар выставлен на продажу')
            .setDescription(`**${newItem.title}** успешно выставлен на рынок!`)
            .addFields(
                { name: '💰 Ваша цена', value: `${newItem.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: `${newItem.quantity}`, inline: true },
                { name: '📂 Категория', value: newItem.category || 'Без категории', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });

        logger.info(`User ${userId} listed ${sellQuantity}x ${item.title} for ${sellPrice} each`);

    } catch (error) {
        logger.error('Error handling sell inventory modal:', error);
        await safeReply(interaction, { content: '❌ Ошибка при выставлении товара на продажу.', flags: 64 });
    }
}

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Login
client.login(process.env.DISCORD_TOKEN);
