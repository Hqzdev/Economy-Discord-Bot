import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { AuctionService } from '../services/simpleAuctionService.js';
import { DealService } from '../services/simpleDealService.js';
import { createMainMenuButtons } from '../ui/components.js';
import db from '../database/jsonDb.js';

// Хранилище интервалов автообновления
const marketUpdateIntervals = new Map();

const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Административная панель с кнопками и меню')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  try {
    // Показываем главное меню админ-панели
    await showAdminMainMenu(interaction);
  } catch (error) {
    console.error('Error in admin command:', error);
    await interaction.reply({
      content: '❌ Произошла ошибка при выполнении команды',
      ephemeral: true,
    });
  }
}

async function showAdminMainMenu(interaction) {
  const listingService = new ListingService();
  const auctionService = new AuctionService();

  // Получаем статистику
  const [listingStats, auctionStats] = await Promise.all([
    listingService.getListingStats(),
    auctionService.getAuctionStats(),
  ]);

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Административная панель')
    .setDescription('Выберите действие с помощью кнопок ниже')
    .setColor(EMBED_COLORS.INFO)
    .addFields(
      {
        name: '📊 Текущая статистика',
        value: `**Активных лотов:** ${listingStats.active}\n**Активных аукционов:** ${auctionStats.scheduled}\n**Всего сделок:** ${listingStats.total || 0}`,
        inline: true,
      },
      {
        name: '🛠️ Доступные действия',
        value: '• Управление рынком\n• Очистка данных\n• Просмотр логов\n• Статистика',
        inline: true,
      }
    )
    .setTimestamp()
    .setFooter({ 
      text: `Администратор: ${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL()
    });

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_market')
        .setLabel('🏪 Рынок')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🏪'),
      new ButtonBuilder()
        .setCustomId('admin_cleanup')
        .setLabel('🧹 Очистка')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🧹')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_logs')
        .setLabel('📋 Логи')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋'),
      new ButtonBuilder()
        .setCustomId('admin_stats')
        .setLabel('📈 Статистика')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📈')
    );

  await interaction.reply({
    embeds: [embed],
    components: [row1, row2],
    ephemeral: true,
  });
}

// Функции для обработки кнопок админ-панели
async function showMarketMenu(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🏪 Управление рынком')
    .setDescription('Выберите действие для управления постоянным сообщением рынка')
    .setColor(EMBED_COLORS.INFO)
    .addFields(
      {
        name: '📋 Доступные действия',
        value: '• **Создать** - Создать постоянное сообщение в текущем канале\n• **Обновить** - Обновить статистику в существующем сообщении\n• **Удалить** - Удалить постоянное сообщение',
        inline: false,
      }
    )
    .setTimestamp();

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_market_create')
        .setLabel('Создать')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('admin_market_update')
        .setLabel('Обновить')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_market_remove')
        .setLabel('Удалить')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Назад')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2],
  });
}

async function showCleanupMenu(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🧹 Управление данными')
    .setDescription('Выберите действие для управления товарами и аукционами')
    .setColor(EMBED_COLORS.WARNING)
    .addFields(
      {
        name: '⚠️ Внимание',
        value: 'Удаление данных необратимо! Будьте осторожны.',
        inline: false,
      },
      {
        name: '📋 Доступные действия',
        value: '• **Товары** - Удалить товары с рынка\n• **Аукционы** - Удалить аукционы\n• **Сделки** - Удалить закрытые сделки',
        inline: false,
      }
    )
    .setTimestamp();

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_cleanup_listings')
        .setLabel('🛒 Товары')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🛒'),
      new ButtonBuilder()
        .setCustomId('admin_cleanup_auctions')
        .setLabel('🔨 Аукционы')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔨')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_cleanup_deals')
        .setLabel('🤝 Сделки')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🤝'),
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Назад')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2],
  });
}

async function showLogsMenu(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Просмотр логов')
    .setDescription('Выберите тип логов для просмотра')
    .setColor(EMBED_COLORS.INFO)
    .addFields(
      {
        name: '📊 Доступные логи',
        value: '• **Аукционы** - Логи завершённых аукционов\n• **Аудит** - Логи действий пользователей',
        inline: false,
      }
    )
    .setTimestamp();

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_logs_auctions')
        .setLabel('Аукционы')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔨'),
      new ButtonBuilder()
        .setCustomId('admin_logs_audit')
        .setLabel('Аудит')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📝')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Назад')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2],
  });
}

async function showStatsMenu(interaction) {
  const listingService = new ListingService();
  const auctionService = new AuctionService();

  const [listingStats, auctionStats] = await Promise.all([
    listingService.getListingStats(),
    auctionService.getAuctionStats(),
  ]);

  const embed = new EmbedBuilder()
    .setTitle('📈 Подробная статистика')
    .setDescription('Детальная информация о состоянии системы')
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields(
      {
        name: '🛒 Товары и лоты',
        value: `**Активных лотов:** ${listingStats.active}\n**Всего лотов:** ${listingStats.total || 0}\n**Неактивных:** ${(listingStats.total || 0) - listingStats.active}`,
        inline: true,
      },
      {
        name: '🔨 Аукционы',
        value: `**Активных аукционов:** ${auctionStats.scheduled}\n**Завершённых:** ${auctionStats.completed || 0}\n**Всего ставок:** ${auctionStats.totalBids || 0}`,
        inline: true,
      },
      {
        name: '👥 Пользователи',
        value: `**Всего пользователей:** ${Array.from(db.data.users.values()).length}\n**Активных продавцов:** ${new Set(Array.from(db.data.listings.values()).map(l => l.sellerId)).size}`,
        inline: true,
      },
      {
        name: '💾 База данных',
        value: `**Размер файла:** ${Math.round(require('fs').statSync(require('path').join(__dirname, '../../data/market.json')).size / 1024)} KB\n**Последнее обновление:** <t:${Math.floor(Date.now() / 1000)}:R>`,
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({ 
      text: `Администратор: ${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL()
    });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Назад')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

// Функции для выполнения действий
async function handleMarketCreate(interaction) {
  try {
    const channel = interaction.channel;
    
    if (!channel.isTextBased()) {
      return await interaction.reply({
        content: '❌ Этот канал не является текстовым',
        ephemeral: true,
      });
    }

    const listingService = new ListingService();
    const auctionService = new AuctionService();

    const [listingStats, auctionStats] = await Promise.all([
      listingService.getListingStats(),
      auctionService.getAuctionStats(),
    ]);

    const imageUrl = 'https://cdn.discordapp.com/attachments/1423960996547924009/1424077421715652668/126-1921x1080-desktop-hd-skyrim-wallpaper-image.jpg?ex=68e2a2f3&is=68e15173&hm=995e0f273f4985292377b6c7f42388f0ba0afd2fd8ffb30abb71bb9761d1f165&';

    // Первый эмбед - только картинка
    const imageEmbed = new EmbedBuilder()
      .setImage(imageUrl)
      .setColor(0x7b9e1e);

    // Второй эмбед - основной текст
    const embed = new EmbedBuilder()
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ Рынок Маркарта ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ \`\`\`

Торговая площадка для обмена товарами между игроками`)
      .setColor(0x7b9e1e)
      .addFields(
        {
          name: '**Барон**',
          value: `\`\`\`ansi
[2;32m[1;32m[4;32m[1;32m[0m[4;32m[0m[1;32m[0m[2;32mОтветственный за экономические вопросы Маркарта. Помимо предложенных функций дискорд. Барон может выдавать займы или разменивать древние монеты и проводить оценку артефактов, для установления их номинальной стоимости рынка.\`\`\``,
          inline: false,
        },
        {
          name: '**Как работает**',
          value: `**Покупка**
<:1_:1423962783535337552> Выберите товар → Создаётся ветка

**Продажа**
<:1_:1423962783535337552> Создайте лот → <:6_:1423966899443601449> Ждите покупателей

**Аукционы**
<:1_:1423962783535337552> <:6_:1423966899443601449> Участвуйте в торгах`,
          inline: false,
        }
      )
      .setImage('https://cdn.discordapp.com/attachments/1423960996547924009/1424764693888897126/f39a806ba38943de1b7dd60db0c63cdd881f408f2faf9d5afe95edd5795e9143.gif?ex=68e52305&is=68e3d185&hm=98812ed949c63c86270cc6e2e6b619136d26c4b5da2edd66f60b6ebba08a83b5&');

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.BUY)
          .setLabel('Купить')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423965832740081684'),
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.SELL)
          .setLabel('Продать')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423966433884373052'),
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.AUCTION)
          .setLabel('Аукционы')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423965583963328633')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS)
          .setLabel('Сделки')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423975784292552765'),
        new ButtonBuilder()
          .setCustomId('market_stats')
          .setLabel('Статистика')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423973804467814400'),
        new ButtonBuilder()
          .setCustomId('market_help')
          .setLabel('Помощь')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423974435228225556')
      );

    const message = await channel.send({
      embeds: [imageEmbed, embed],
      components: [row1, row2],
    });

    db.setPersistentMessage('market', channel.id, message.id);

    // Запускаем автоматическое обновление каждые 10 минут
    startMarketAutoUpdate(interaction.client, channel.id, message.id);

    await interaction.reply({
      content: `✅ Постоянное сообщение рынка создано в канале ${channel}\n\n📝 **ID сообщения:** \`${message.id}\`\n🔄 **Автообновление:** каждые 10 минут`,
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error creating market:', error);
    await interaction.reply({
      content: '❌ Ошибка при создании постоянного сообщения рынка',
      ephemeral: true,
    });
  }
}

async function handleMarketUpdate(interaction) {
  try {
    const persistentMessage = db.getPersistentMessage('market');
    
    if (!persistentMessage) {
      return await interaction.reply({
        content: '❌ Постоянное сообщение рынка не найдено',
        ephemeral: true,
      });
    }

    const channel = await interaction.client.channels.fetch(persistentMessage.channelId);
    if (!channel) {
      return await interaction.reply({
        content: '❌ Канал с постоянным сообщением не найден',
        ephemeral: true,
      });
    }

    const message = await channel.messages.fetch(persistentMessage.messageId);
    if (!message) {
      return await interaction.reply({
        content: '❌ Постоянное сообщение не найдено в канале',
        ephemeral: true,
      });
    }

    const listingService = new ListingService();
    const auctionService = new AuctionService();

    const [listingStats, auctionStats] = await Promise.all([
      listingService.getListingStats(),
      auctionService.getAuctionStats(),
    ]);

    const imageUrl = 'https://cdn.discordapp.com/attachments/1423960996547924009/1424077421715652668/126-1921x1080-desktop-hd-skyrim-wallpaper-image.jpg?ex=68e2a2f3&is=68e15173&hm=995e0f273f4985292377b6c7f42388f0ba0afd2fd8ffb30abb71bb9761d1f165&';

    // Первый эмбед - только картинка
    const imageEmbed = new EmbedBuilder()
      .setImage(imageUrl)
      .setColor(0x7b9e1e);

    // Второй эмбед - основной текст
    const embed = new EmbedBuilder()
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ Рынок Маркарта ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ \`\`\`

Торговая площадка для обмена товарами между игроками`)
      .setColor(0x7b9e1e)
      .addFields(
        {
          name: '**Барон**',
          value: `\`\`\`__Барон __- Ответственный за экономические вопросы Маркарта. Помимо предложенных функций дискорд. Барон может выдавать займы или разменивать древние монеты и проводить оценку артефактов, для установления их номинальной стоимости рынка.\`\`\``,
          inline: false,
        },
        {
          name: '**Как работает**',
          value: `**Покупка**
<:1_:1423962783535337552> Выберите товар → Создаётся ветка

**Продажа**
<:1_:1423962783535337552> Создайте лот → <:6_:1423966899443601449> Ждите покупателей

**Аукционы**
<:1_:1423962783535337552> <:6_:1423966899443601449> Участвуйте в торгах`,
          inline: false,
        }
      );

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.BUY)
          .setLabel('Купить')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423965832740081684'),
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.SELL)
          .setLabel('Продать')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423966433884373052'),
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.AUCTION)
          .setLabel('Аукционы')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423965583963328633')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS)
          .setLabel('Сделки')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423975784292552765'),
        new ButtonBuilder()
          .setCustomId('market_stats')
          .setLabel('Статистика')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423973804467814400'),
        new ButtonBuilder()
          .setCustomId('market_help')
          .setLabel('Помощь')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423974435228225556')
      );

    await message.edit({
      embeds: [imageEmbed, embed],
      components: [row1, row2],
    });

    await interaction.reply({
      content: `✅ Постоянное сообщение рынка обновлено\n\n📊 **Обновлённая статистика:**\n🛒 Активных лотов: ${listingStats.active}\n🔨 Активных аукционов: ${auctionStats.scheduled}`,
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error updating market:', error);
    await interaction.reply({
      content: '❌ Ошибка при обновлении постоянного сообщения рынка',
      ephemeral: true,
    });
  }
}

async function handleMarketRemove(interaction) {
  try {
    const persistentMessage = db.getPersistentMessage('market');
    
    if (!persistentMessage) {
      return await interaction.reply({
        content: '❌ Постоянное сообщение рынка не найдено',
        ephemeral: true,
      });
    }

    const channel = await interaction.client.channels.fetch(persistentMessage.channelId);
    if (channel) {
      try {
        const message = await channel.messages.fetch(persistentMessage.messageId);
        if (message) {
          await message.delete();
        }
      } catch (error) {
        console.log('Message already deleted or not found');
      }
    }

    db.removePersistentMessage('market');

    // Останавливаем автоматическое обновление
    stopMarketAutoUpdate(persistentMessage.channelId, persistentMessage.messageId);

    await interaction.reply({
      content: `✅ Постоянное сообщение рынка удалено\n\n📝 **Удалённое сообщение:**\n🆔 ID: \`${persistentMessage.messageId}\`\n📺 Канал: <#${persistentMessage.channelId}>\n🛑 **Автообновление:** остановлено`,
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error removing market:', error);
    await interaction.reply({
      content: '❌ Ошибка при удалении постоянного сообщения рынка',
      ephemeral: true,
    });
  }
}

async function showListingsManagement(interaction) {
  const allListings = Array.from(db.data.listings.values());
  const activeListings = allListings.filter(listing => listing.status === 'ACTIVE');
  const inactiveListings = allListings.filter(listing => listing.status !== 'ACTIVE' || listing.quantityAvailable <= 0);

  const embed = new EmbedBuilder()
    .setTitle('🛒 Управление товарами')
    .setDescription('Выберите действие для управления товарами на рынке')
    .setColor(EMBED_COLORS.WARNING)
    .addFields(
      {
        name: '📊 Статистика товаров',
        value: `**Всего товаров:** ${allListings.length}\n**Активных:** ${activeListings.length}\n**Неактивных:** ${inactiveListings.length}`,
        inline: false,
      },
      {
        name: '⚠️ Внимание',
        value: 'Удаление товаров необратимо!',
        inline: false,
      }
    )
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('admin_listings_select')
    .setPlaceholder('Выберите действие с товарами')
    .addOptions([
      {
        label: 'Удалить все товары',
        description: 'Удалить все товары с рынка',
        value: 'delete_all',
        emoji: '🗑️',
      },
      {
        label: 'Удалить только неактивные',
        description: 'Удалить товары с нулевым количеством',
        value: 'delete_inactive',
        emoji: '❌',
      },
      {
        label: 'Показать все товары',
        description: 'Просмотр всех товаров для выборочного удаления',
        value: 'show_all',
        emoji: '👁️',
      },
    ]);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Назад')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2],
  });
}

async function showAuctionsManagement(interaction) {
  const allAuctions = Array.from(db.data.auctions.values());
  const activeAuctions = allAuctions.filter(auction => auction.status === 'ACTIVE');
  const completedAuctions = allAuctions.filter(auction => auction.status === 'COMPLETED' || auction.status === 'CANCELLED');

  const embed = new EmbedBuilder()
    .setTitle('🔨 Управление аукционами')
    .setDescription('Выберите действие для управления аукционами')
    .setColor(EMBED_COLORS.WARNING)
    .addFields(
      {
        name: '📊 Статистика аукционов',
        value: `**Всего аукционов:** ${allAuctions.length}\n**Активных:** ${activeAuctions.length}\n**Завершённых:** ${completedAuctions.length}`,
        inline: false,
      },
      {
        name: '⚠️ Внимание',
        value: 'Удаление аукционов необратимо!',
        inline: false,
      }
    )
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('admin_auctions_select')
    .setPlaceholder('Выберите действие с аукционами')
    .addOptions([
      {
        label: 'Удалить все аукционы',
        description: 'Удалить все аукционы',
        value: 'delete_all',
        emoji: '🗑️',
      },
      {
        label: 'Удалить только завершённые',
        description: 'Удалить завершённые и отменённые аукционы',
        value: 'delete_completed',
        emoji: '✅',
      },
      {
        label: 'Показать все аукционы',
        description: 'Просмотр всех аукционов для выборочного удаления',
        value: 'show_all',
        emoji: '👁️',
      },
    ]);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_back')
        .setLabel('Назад')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2],
  });
}

async function handleCleanup(interaction, type) {
  try {
    let deletedListings = 0;
    let deletedAuctions = 0;
    let deletedDeals = 0;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ОЧИСТКА РЫНКА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
      .setTimestamp()
      .setFooter({ 
        text: `Администратор: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    if (type === 'listings' || type === 'all') {
      const allListings = Array.from(db.data.listings.values());
      const inactiveListings = allListings.filter(listing => 
        listing.status !== 'ACTIVE' || listing.quantityAvailable <= 0
      );
      
      for (const listing of inactiveListings) {
        db.data.listings.delete(listing.id);
        deletedListings++;
      }
    }

    if (type === 'auctions' || type === 'all') {
      const allAuctions = Array.from(db.data.auctions.values());
      const completedAuctions = allAuctions.filter(auction => 
        auction.status === 'COMPLETED' || auction.status === 'CANCELLED'
      );
      
      for (const auction of completedAuctions) {
        db.data.auctions.delete(auction.id);
        deletedAuctions++;
      }
    }

    if (type === 'deals' || type === 'all') {
      const allDeals = Array.from(db.data.deals.values());
      const closedDeals = allDeals.filter(deal => 
        deal.status === 'COMPLETED' || deal.status === 'CANCELLED' || deal.status === 'CLOSED'
      );
      
      for (const deal of closedDeals) {
        db.data.deals.delete(deal.id);
        deletedDeals++;
      }
    }

    db.save();

    let description = 'Очистка завершена успешно!\n\n';
    
    if (type === 'listings' || type === 'all') {
      description += `🗑️ **Удалено товаров:** ${deletedListings}\n`;
    }
    
    if (type === 'auctions' || type === 'all') {
      description += `🗑️ **Удалено аукционов:** ${deletedAuctions}\n`;
    }
    
    if (type === 'deals' || type === 'all') {
      description += `🗑️ **Удалено сделок:** ${deletedDeals}\n`;
    }

    if (deletedListings === 0 && deletedAuctions === 0 && deletedDeals === 0) {
      description = 'Нечего удалять - все записи активны.';
    }

    embed.setDescription(description);

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error in cleanup:', error);
    await interaction.reply({
      content: '❌ Ошибка при выполнении очистки',
      ephemeral: true,
    });
  }
}

async function handleAuctionLogs(interaction) {
  try {
    if (!db.data.auctionLogs) {
      return await interaction.reply({
        content: '❌ Логи аукционов не найдены',
        ephemeral: true,
      });
    }

    let logs = Array.from(db.data.auctionLogs.values());
    logs = logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    if (logs.length === 0) {
      return await interaction.reply({
        content: '❌ Логи аукционов не найдены',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ЛОГИ АУКЦИОНОВ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
      .setTimestamp()
      .setFooter({ 
        text: `Администратор: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    for (const log of logs) {
      const resultText = log.result.status === 'COMPLETED' 
        ? `🏆 Победитель: <@${log.result.winnerId}> (${log.result.winnerUsername})\n💰 Выигрышная ставка: ${log.result.winningAmount} `
        : '❌ Без ставок';

      const bidsText = log.bids.length > 0 
        ? log.bids.slice(0, 3).map(bid => 
            `• <@${bid.bidderId}> - ${bid.amount} `
          ).join('\n') + (log.bids.length > 3 ? `\n... и еще ${log.bids.length - 3} ставок` : '')
        : 'Нет ставок';

      embed.addFields({
        name: `🔨 Аукцион #${log.auctionId} - ${log.itemName}`,
        value: `**Создатель:** <@${log.creator.discordId}> (${log.creator.username})\n**Категория:** ${log.category}\n**Мин. цена:** ${log.minPrice} \n**Ставок:** ${log.totalBids}\n**Результат:** ${resultText}\n**Топ ставки:**\n${bidsText}`,
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error in auction logs:', error);
    await interaction.reply({
      content: '❌ Ошибка при получении логов аукционов',
      ephemeral: true,
    });
  }
}

// Функции для удаления товаров и аукционов
async function handleListingsDelete(interaction, action) {
  try {
    const allListings = Array.from(db.data.listings.values());
    let deletedCount = 0;

    if (action === 'delete_all') {
      // Удаляем все товары
      for (const listing of allListings) {
        db.data.listings.delete(listing.id);
        deletedCount++;
      }
    } else if (action === 'delete_inactive') {
      // Удаляем только неактивные товары
      const inactiveListings = allListings.filter(listing => 
        listing.status !== 'ACTIVE' || listing.quantityAvailable <= 0
      );
      for (const listing of inactiveListings) {
        db.data.listings.delete(listing.id);
        deletedCount++;
      }
    }

    db.save();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ УДАЛЕНИЕ ТОВАРОВ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
      .addFields({
        name: 'Результат',
        value: `🗑️ **Удалено товаров:** ${deletedCount}\n\n${deletedCount === 0 ? 'Нечего удалять' : 'Удаление завершено успешно!'}`,
        inline: false,
      })
      .setTimestamp()
      .setFooter({ 
        text: `Администратор: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error deleting listings:', error);
    await interaction.reply({
      content: '❌ Ошибка при удалении товаров',
      ephemeral: true,
    });
  }
}

async function handleAuctionsDelete(interaction, action) {
  try {
    const allAuctions = Array.from(db.data.auctions.values());
    let deletedCount = 0;

    if (action === 'delete_all') {
      // Удаляем все аукционы
      for (const auction of allAuctions) {
        db.data.auctions.delete(auction.id);
        deletedCount++;
      }
    } else if (action === 'delete_completed') {
      // Удаляем только завершённые аукционы
      const completedAuctions = allAuctions.filter(auction => 
        auction.status === 'COMPLETED' || auction.status === 'CANCELLED'
      );
      for (const auction of completedAuctions) {
        db.data.auctions.delete(auction.id);
        deletedCount++;
      }
    }

    db.save();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ УДАЛЕНИЕ АУКЦИОНОВ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
      .addFields({
        name: 'Результат',
        value: `🗑️ **Удалено аукционов:** ${deletedCount}\n\n${deletedCount === 0 ? 'Нечего удалять' : 'Удаление завершено успешно!'}`,
        inline: false,
      })
      .setTimestamp()
      .setFooter({ 
        text: `Администратор: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error deleting auctions:', error);
    await interaction.reply({
      content: '❌ Ошибка при удалении аукционов',
      ephemeral: true,
    });
  }
}

async function showListingsList(interaction) {
  try {
    const allListings = Array.from(db.data.listings.values());
    
    if (allListings.length === 0) {
      await interaction.reply({
        content: '❌ Товары не найдены',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Список всех товаров')
      .setDescription('Все товары на рынке')
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    // Показываем первые 10 товаров
    for (const listing of allListings.slice(0, 10)) {
      const status = listing.status === 'ACTIVE' ? '🟢 Активен' : '🔴 Неактивен';
      embed.addFields({
        name: `${listing.itemName} (ID: ${listing.id})`,
        value: `**Статус:** ${status}\n**Количество:** ${listing.quantityAvailable}\n**Цена:** ${listing.price} <:steamworkshop_collection_8776158:1423962802640650351>\n**Продавец:** <@${listing.sellerId}>`,
        inline: true,
      });
    }

    if (allListings.length > 10) {
      embed.setFooter({ text: `Показано 10 из ${allListings.length} товаров` });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error showing listings list:', error);
    await interaction.reply({
      content: '❌ Ошибка при получении списка товаров',
      ephemeral: true,
    });
  }
}

async function showAuctionsList(interaction) {
  try {
    const allAuctions = Array.from(db.data.auctions.values());
    
    if (allAuctions.length === 0) {
      await interaction.reply({
        content: '❌ Аукционы не найдены',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔨 Список всех аукционов')
      .setDescription('Все аукционы в системе')
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    // Показываем первые 10 аукционов
    for (const auction of allAuctions.slice(0, 10)) {
      const status = auction.status === 'ACTIVE' ? '🟢 Активен' : 
                    auction.status === 'COMPLETED' ? '✅ Завершён' : 
                    auction.status === 'CANCELLED' ? '❌ Отменён' : '⏸️ Неизвестно';
      
      embed.addFields({
        name: `${auction.itemName} (ID: ${auction.id})`,
        value: `**Статус:** ${status}\n**Мин. цена:** ${auction.minPrice} <:steamworkshop_collection_8776158:1423962802640650351>\n**Создатель:** <@${auction.creatorId}>\n**Завершится:** <t:${Math.floor(new Date(auction.endTime).getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    if (allAuctions.length > 10) {
      embed.setFooter({ text: `Показано 10 из ${allAuctions.length} аукционов` });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

  } catch (error) {
    console.error('Error showing auctions list:', error);
    await interaction.reply({
      content: '❌ Ошибка при получении списка аукционов',
      ephemeral: true,
    });
  }
}

// Функции для автоматического обновления рынка
function startMarketAutoUpdate(client, channelId, messageId) {
  const key = `${channelId}-${messageId}`;
  
  // Останавливаем предыдущий интервал, если он существует
  if (marketUpdateIntervals.has(key)) {
    clearInterval(marketUpdateIntervals.get(key));
  }

  // Создаем новый интервал обновления каждые 10 минут (600000 мс)
  const interval = setInterval(async () => {
    try {
      await updateMarketMessage(client, channelId, messageId);
    } catch (error) {
      console.error('Error in market auto-update:', error);
      // Если ошибка, останавливаем автообновление
      stopMarketAutoUpdate(channelId, messageId);
    }
  }, 600000); // 10 минут

  marketUpdateIntervals.set(key, interval);
  console.log(`Market auto-update started for channel ${channelId}, message ${messageId}`);
}

function stopMarketAutoUpdate(channelId, messageId) {
  const key = `${channelId}-${messageId}`;
  
  if (marketUpdateIntervals.has(key)) {
    clearInterval(marketUpdateIntervals.get(key));
    marketUpdateIntervals.delete(key);
    console.log(`Market auto-update stopped for channel ${channelId}, message ${messageId}`);
  }
}

async function updateMarketMessage(client, channelId, messageId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.log(`Channel ${channelId} not found, stopping auto-update`);
      stopMarketAutoUpdate(channelId, messageId);
      return;
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      console.log(`Message ${messageId} not found, stopping auto-update`);
      stopMarketAutoUpdate(channelId, messageId);
      return;
    }

    const listingService = new ListingService();
    const auctionService = new AuctionService();

    const [listingStats, auctionStats] = await Promise.all([
      listingService.getListingStats(),
      auctionService.getAuctionStats(),
    ]);

    const imageUrl = 'https://cdn.discordapp.com/attachments/1423960996547924009/1424077421715652668/126-1921x1080-desktop-hd-skyrim-wallpaper-image.jpg?ex=68e2a2f3&is=68e15173&hm=995e0f273f4985292377b6c7f42388f0ba0afd2fd8ffb30abb71bb9761d1f165&';

    // Первый эмбед - только картинка
    const imageEmbed = new EmbedBuilder()
      .setImage(imageUrl)
      .setColor(0x7b9e1e);

    // Второй эмбед - основной текст
    const embed = new EmbedBuilder()
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ Рынок Маркарта ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ \`\`\`

Торговая площадка для обмена товарами между игроками`)
      .setColor(0x7b9e1e)
      .addFields(
        {
          name: '**Барон**',
          value: `\`\`\`__Барон __- Ответственный за экономические вопросы Маркарта. Помимо предложенных функций дискорд. Барон может выдавать займы или разменивать древние монеты и проводить оценку артефактов, для установления их номинальной стоимости рынка.\`\`\``,
          inline: false,
        },
        {
          name: '**Как работает**',
          value: `**Покупка**
<:1_:1423962783535337552> Выберите товар → Создаётся ветка

**Продажа**
<:1_:1423962783535337552> Создайте лот → <:6_:1423966899443601449> Ждите покупателей

**Аукционы**
<:1_:1423962783535337552> <:6_:1423966899443601449> Участвуйте в торгах`,
          inline: false,
        }
      );

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.BUY)
          .setLabel('Купить')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423965832740081684'),
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.SELL)
          .setLabel('Продать')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423966433884373052'),
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.AUCTION)
          .setLabel('Аукционы')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423965583963328633')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS)
          .setLabel('Сделки')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423975784292552765'),
        new ButtonBuilder()
          .setCustomId('market_stats')
          .setLabel('Статистика')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423973804467814400'),
        new ButtonBuilder()
          .setCustomId('market_help')
          .setLabel('Помощь')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('1423974435228225556')
      );

    await message.edit({
      embeds: [imageEmbed, embed],
      components: [row1, row2],
    });

    console.log(`Market message updated: ${listingStats.active} listings, ${auctionStats.scheduled} auctions`);

  } catch (error) {
    console.error('Error updating market message:', error);
    throw error;
  }
}

// Функция для восстановления автообновления при перезапуске бота
export function restoreMarketAutoUpdates(client) {
  const persistentMessage = db.getPersistentMessage('market');
  if (persistentMessage) {
    startMarketAutoUpdate(client, persistentMessage.channelId, persistentMessage.messageId);
    console.log('Market auto-update restored after bot restart');
  }
}

// Экспортируем функции для использования в обработчиках
export {
  showAdminMainMenu,
  showMarketMenu,
  showCleanupMenu,
  showLogsMenu,
  showStatsMenu,
  showListingsManagement,
  showAuctionsManagement,
  handleMarketCreate,
  handleMarketUpdate,
  handleMarketRemove,
  handleCleanup,
  handleAuctionLogs,
  handleListingsDelete,
  handleAuctionsDelete,
  showListingsList,
  showAuctionsList,
  startMarketAutoUpdate,
  stopMarketAutoUpdate,
  updateMarketMessage
};

export default { data, execute };
