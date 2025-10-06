import { 
  ButtonInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { DealService } from '../services/simpleDealService.js';
import { AuctionService } from '../services/simpleAuctionService.js';
import { AuditService } from '../services/simpleAuditService.js';
import { UserService } from '../services/simpleUserService.js';
import { config } from '../config/index.js';
import { 
  createMainMenuButtons, 
  createSellModal, 
  createDealControlButtons,
  createDealsMenuButtons,
  createPaginationButtons,
  createListingSelectMenu,
  createDealEmbed,
  createDealThreadEmbed,
  createListingEmbed,
  createCategorySelectMenu,
  createSellCategorySelectMenu,
  createChangeQuantityModal
} from '../ui/components.js';
import {
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
  handleAuctionLogs
} from '../commands/admin.js';

export class ButtonHandler {
  constructor() {
    this.listingService = new ListingService();
    this.dealService = new DealService();
    this.auctionService = new AuctionService();
    this.auditService = new AuditService();
    this.userService = new UserService();
  }

  setClient(client) {
    this.auctionService.setClient(client);
    // Используем связанные сервисы если доступны
    if (client.listingService) {
      this.listingService = client.listingService;
    }
    if (client.auctionService) {
      this.auctionService = client.auctionService;
    }
  }

  async handle(interaction) {
    try {
      // Не деферим глобально: разные обработчики используют update/reply/showModal
      // Деферим точечно внутри методов, где нужна editReply/followUp

      const { customId } = interaction;

      // Main menu buttons
      if (customId === UI_CONSTANTS.BUTTON_IDS.BUY) {
        await this.handleBuyButton(interaction);
      } else if (customId === UI_CONSTANTS.BUTTON_IDS.SELL) {
        await this.handleSellButton(interaction);
      } else if (customId === UI_CONSTANTS.BUTTON_IDS.AUCTION) {
        await this.handleAuctionButton(interaction);
      } else if (customId === UI_CONSTANTS.BUTTON_IDS.DEALS) {
        await this.handleDealsButton(interaction);
            } else if (customId === 'market_stats') {
              await this.handleMarketStatsButton(interaction);
            } else if (customId === 'market_help') {
              await this.handleMarketHelpButton(interaction);
            } else if (customId === 'market_search') {
              await this.handleMarketSearchButton(interaction);
            } else if (customId.startsWith('auction_bid_')) {
              await this.handleAuctionBidButton(interaction);
            } else if (customId.startsWith('auction_withdraw_')) {
              await this.handleAuctionWithdrawButton(interaction);
            }
      // Admin panel buttons
      else if (customId === 'admin_market') {
        await showMarketMenu(interaction);
      } else if (customId === 'admin_cleanup') {
        await showCleanupMenu(interaction);
      } else if (customId === 'admin_logs') {
        await showLogsMenu(interaction);
      } else if (customId === 'admin_stats') {
        await showStatsMenu(interaction);
      } else if (customId === 'admin_back') {
        await showAdminMainMenu(interaction);
      } else if (customId === 'admin_market_create') {
        await handleMarketCreate(interaction);
      } else if (customId === 'admin_market_update') {
        await handleMarketUpdate(interaction);
      } else if (customId === 'admin_market_remove') {
        await handleMarketRemove(interaction);
      } else if (customId === 'admin_logs_auctions') {
        await handleAuctionLogs(interaction);
      } else if (customId === 'admin_cleanup_listings') {
        await showListingsManagement(interaction);
      } else if (customId === 'admin_cleanup_auctions') {
        await showAuctionsManagement(interaction);
      }
      // Deal control buttons
      else if (customId.startsWith(UI_CONSTANTS.BUTTON_IDS.CONFIRM_DEAL)) {
        await this.handleConfirmDealButton(interaction);
      } else if (customId.startsWith(UI_CONSTANTS.BUTTON_IDS.CANCEL_DEAL)) {
        await this.handleCancelDealButton(interaction);
      } else if (customId.startsWith(UI_CONSTANTS.BUTTON_IDS.CHANGE_QUANTITY)) {
        await this.handleChangeQuantityButton(interaction);
      } else if (customId.startsWith(UI_CONSTANTS.BUTTON_IDS.CLOSE_DEAL)) {
        await this.handleCloseDealButton(interaction);
      }
      // Deals menu buttons
      else if (customId === UI_CONSTANTS.BUTTON_IDS.DEALS_HISTORY) {
        await this.handleDealsHistoryButton(interaction);
      } else if (customId === UI_CONSTANTS.BUTTON_IDS.DEALS_ACTIVE) {
        await this.handleDealsActiveButton(interaction);
      }
      // Pagination buttons
      else if (customId.startsWith('listing_') && (customId.includes('_prev_') || customId.includes('_next_'))) {
        await this.handleListingPagination(interaction);
      } else if (customId.startsWith('deals_') && (customId.includes('_prev_') || customId.includes('_next_'))) {
        await this.handleDealsPagination(interaction);
      }

    } catch (error) {
      console.error('Error in button handler:', error);
      await this.handleError(interaction, error);
    }
  }

  async handleBuyButton(interaction) {
    const page = 1;
    const { listings, total, totalPages } = await this.listingService.getActiveListings('', page);

    if (listings.length === 0) {
      // Для editReply требуется предварительный deferReply
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({
        content: TEXTS.BUY.NO_LISTINGS,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ПОКУПКА ТОВАРОВ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Найдено ${total} активных лотов. Страница ${page} из ${totalPages}`)
      .setTimestamp()
      .setFooter({ 
        text: `Пользователь: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    const components = [];
    
    if (listings.length > 0) {
      components.push(createListingSelectMenu(listings));
    }

    const paginationRow = createPaginationButtons(page, totalPages, 'listing');
    if (paginationRow) {
      components.push(paginationRow);
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({
      embeds: [embed],
      components,
    });
  }

  async handleSellButton(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СОЗДАНИЕ ЛОТА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Выберите категорию товара для создания лота`)
        .setThumbnail('https://cdn.discordapp.com/attachments/1423960996547924009/1423984163979264161/5.png?ex=68e24c19&is=68e0fa99&hm=429ef97a6139be1f3805e12d077b950aa055f7e43c431138d4cca342776f5a77&')
        .setColor(0x7b9e1e)
        .setTimestamp()
        .setFooter({ 
          text: `Пользователь: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      const categorySelectMenu = createSellCategorySelectMenu();

      await interaction.editReply({
        embeds: [embed],
        components: [categorySelectMenu],
      });
    } catch (error) {
      console.error('Error showing sell category selection:', error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({
        content: '<:679:1423974435228225556> Ошибка при открытии выбора категории',
      });
    }
  }

  async handleAuctionButton(interaction) {
    const auctions = await this.auctionService.getActiveAuctions();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АКТИВНЫЕ АУКЦИОНЫ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
      .setThumbnail('https://cdn.discordapp.com/attachments/1423960996547924009/1423984166210502666/2.png?ex=68e24c19&is=68e0fa99&hm=7b22038be1a6e761a106aefc809ced820ef293f09f28a13b72c36dfc72e61692&')
      .setTimestamp()
      .setFooter({ 
        text: `Пользователь: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    if (auctions.length === 0) {
      embed.setDescription('Активных аукционов нет');
    } else {
      embed.setDescription(`Найдено ${auctions.length} активных аукционов`);
      
      for (const auction of auctions.slice(0, 10)) {
        const timeLeft = Math.max(0, Math.floor((auction.endTime.getTime() - Date.now()) / 1000));
        const timeLeftText = timeLeft > 0 ? `<t:${Math.floor(auction.endTime.getTime() / 1000)}:R>` : 'Завершён';
        
        embed.addFields({
          name: `${auction.itemName} (ID: \`${auction.id}\`)`,
          value: `**Завершится**\n> ${timeLeftText}\n\n**Мин. ставка**\n> ${auction.minPrice} <:steamworkshop_collection_8776158:1423962802640650351>\n\n**Создатель**\n> <@${auction.creator.discordId}>${auction.description ? `\n\n**Описание**\n> ${auction.description}` : ''}`,
          inline: false,
        });
      }
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({
      embeds: [embed],
    });
  }

  async handleDealsButton(interaction) {
    const row = createDealsMenuButtons();
    
    const embed = new EmbedBuilder()
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ УПРАВЛЕНИЕ СДЕЛКАМИ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Выберите действие`)
.setThumbnail('https://cdn.discordapp.com/attachments/1423960996547924009/1423984167259082843/324.png?ex=68e24c19&is=68e0fa99&hm=1687e74934e1e22d9f643278bf692a4598ca9ebf9f84fb3385bc00a1086680d4&')
      .setColor(EMBED_COLORS.PRIMARY)
      .setTimestamp()
      .setFooter({ 
        text: `Пользователь: ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  }

  async handleConfirmDealButton(interaction) {
    const dealId = interaction.customId.split('_').pop();
    
    try {
      const deal = await this.dealService.confirmDeal(dealId, interaction.user.id);

      await this.auditService.logAction(interaction.user.id, 'DEAL_CONFIRMED', {
        dealId,
        totalAmount: deal.price * deal.quantity,
      });

      const isCompleted = deal.status === 'COMPLETED';
      
      // Get internal user ID for comparison
      const user = await this.userService.getOrCreateUser(interaction.user.id);
      const isBuyer = deal.buyerId === user.id;
      const userRole = isBuyer ? 'покупатель' : 'продавец';

      let embed;
      if (isCompleted) {
        embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СДЕЛКА ЗАВЕРШЕНА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Сделка #${dealId} успешно завершена обеими сторонами!`)
          .addFields(
            {
              name: '**Товар**',
              value: `> ${deal.itemName}`,
              inline: true,
            },
            {
              name: '**Количество**',
              value: `> ${deal.quantity}`,
              inline: true,
            },
            {
              name: '**Цена в игре**',
              value: `> ${deal.price * deal.quantity} <:steamworkshop_collection_8776158:1423962802640650351>`,
              inline: true,
            },
            {
              name: '**Важно**',
              value: '> Переведите деньги в игре продавцу',
              inline: false,
            }
          )
          .setTimestamp();
      } else {
        embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.PRIMARY)
          .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ПОДТВЕРЖДЕНИЕ ПОЛУЧЕНО ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Вы (${userRole}) подтвердили сделку #${dealId}`)
          .addFields(
            {
              name: '**Статус**',
              value: isBuyer ? 
                (deal.sellerConfirmed ? '> <:679:1423974435228225556> Продавец подтвердил' : '> <:4_:1423965817523142666> Ожидает подтверждения продавца') :
                (deal.buyerConfirmed ? '> <:679:1423974435228225556> Покупатель подтвердил' : '> <:4_:1423965817523142666> Ожидает подтверждения покупателя'),
              inline: false,
            }
          )
          .setTimestamp();
      }

      await interaction.editReply({
        embeds: [embed],
      });

      // Update the thread with new status
      const dealEmbed = createDealThreadEmbed(deal, null);
      const controlRow = createDealControlButtons(deal, user.id);

      await interaction.followUp({
        embeds: [dealEmbed],
        components: controlRow ? [controlRow] : [],
      });

      // If deal is completed, delete the thread after 5 seconds
      if (isCompleted && deal.threadId) {
        setTimeout(async () => {
          try {
            const thread = await interaction.client.channels.fetch(deal.threadId);
            if (thread) {
              await thread.delete('Сделка завершена');
              logger.info(`Deleted completed deal thread: ${deal.threadId}`);
            }
          } catch (error) {
            logger.info(`Thread ${deal.threadId} already deleted or inaccessible`);
          }
        }, 5000); // 5 seconds delay
      }
    } catch (error) {
      if (!interaction.replied && !interaction.deferred) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({
          content: `<:679:1423974435228225556> Ошибка: ${error.message}`,
        });
      } else {
        await interaction.followUp({
          content: `<:679:1423974435228225556> Ошибка: ${error.message}`,
          ephemeral: true,
        });
      }
    }
  }

  async handleCancelDealButton(interaction) {
    const dealId = interaction.customId.split('_').pop();
    const deal = await this.dealService.cancelDeal(dealId, interaction.user.id);

    await this.auditService.logAction(interaction.user.id, 'DEAL_CANCELLED', {
      dealId,
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СДЕЛКА ОТМЕНЕНА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Сделка #${dealId} отменена`)
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    // Delete the thread after 5 seconds
    if (deal && deal.threadId) {
      setTimeout(async () => {
        try {
          const thread = await interaction.client.channels.fetch(deal.threadId);
          if (thread) {
            await thread.delete('Сделка отменена');
            logger.info(`Deleted cancelled deal thread: ${deal.threadId}`);
          }
        } catch (error) {
          logger.info(`Thread ${deal.threadId} already deleted or inaccessible`);
        }
      }, 5000); // 5 seconds delay
    }
  }

  async handleChangeQuantityButton(interaction) {
    const dealId = interaction.customId.split('_').pop();
    const deal = await this.dealService.getDealById(dealId);

    // Get internal user ID for comparison
    const user = await this.userService.getOrCreateUser(interaction.user.id);

    if (!deal || deal.buyerId !== user.id) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({
        content: TEXTS.ERRORS.ONLY_BUYER_CONTROL,
      });
      return;
    }

    const modal = createChangeQuantityModal(deal.quantity);
    await interaction.showModal(modal);
  }

  async handleCloseDealButton(interaction) {
    const dealId = interaction.customId.split('_').pop();
    const deal = await this.dealService.getDealById(dealId);

    // Get internal user ID for comparison
    const user = await this.userService.getOrCreateUser(interaction.user.id);

    if (!deal || (deal.buyerId !== user.id && deal.sellerId !== user.id)) {
      await interaction.editReply({
        content: 'Только участники сделки могут её закрыть',
      });
      return;
    }

    const closedDeal = await this.dealService.closeDeal(dealId, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СДЕЛКА ЗАКРЫТА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Сделка #${dealId} закрыта участником`)
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    // Delete the thread after 5 seconds
    if (closedDeal && closedDeal.threadId) {
      setTimeout(async () => {
        try {
          const thread = await interaction.client.channels.fetch(closedDeal.threadId);
          if (thread) {
            await thread.delete('Сделка закрыта');
            logger.info(`Deleted closed deal thread: ${closedDeal.threadId}`);
          }
        } catch (error) {
          logger.info(`Thread ${closedDeal.threadId} already deleted or inaccessible`);
        }
      }, 5000); // 5 seconds delay
    }
  }

  async handleDealsHistoryButton(interaction) {
    const { deals, total, page, totalPages } = await this.dealService.getUserDealHistory(interaction.user.id);

    if (deals.length === 0) {
      await interaction.reply({
        content: TEXTS.DEALS.NO_DEALS,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ИСТОРИЯ СДЕЛОК ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Найдено ${total} завершённых сделок. Страница ${page} из ${totalPages}`)
      .setTimestamp();

    for (const deal of deals.slice(0, 5)) {
      const totalPrice = deal.price * deal.quantity;
      embed.addFields({
        name: `Сделка #${deal.id}`,
        value: `**Товар**\n> ${deal.itemName}\n\n**Количество**\n> ${deal.quantity}\n\n**Цена**\n> ${deal.price} <:steamworkshop_collection_8776158:1423962802640650351> за единицу\n\n**Общая стоимость**\n> ${totalPrice} <:steamworkshop_collection_8776158:1423962802640650351>\n\n**Продавец**\n> <@${deal.seller.discordId}>\n\n**Покупатель**\n> <@${deal.buyer.discordId}>\n\n**Дата**\n> <t:${Math.floor(new Date(deal.createdAt).getTime() / 1000)}:R>`,
        inline: false,
      });
    }

    const components = [];
    const paginationRow = createPaginationButtons(page, totalPages, 'deals');
    if (paginationRow) {
      components.push(paginationRow);
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({
      embeds: [embed],
      components,
    });
  }

  async handleDealsActiveButton(interaction) {
    const deals = await this.dealService.getUserActiveDeals(interaction.user.id);

    if (deals.length === 0) {
      await interaction.reply({
        content: 'У вас нет активных сделок',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.WARNING)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АКТИВНЫЕ СДЕЛКИ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

У вас ${deals.length} активных сделок:`)
      .setTimestamp();

    // Get internal user ID for comparison
    const user = await this.userService.getOrCreateUser(interaction.user.id);
    
    for (const deal of deals.slice(0, 10)) {
      const totalPrice = deal.price * deal.quantity;
      const role = deal.buyerId === user.id ? 'Покупатель' : 'Продавец';
      
      embed.addFields({
        name: `Сделка #${deal.id} (${role})`,
        value: `**Товар:** ${deal.itemName}\n**Количество:** ${deal.quantity}\n**Общая стоимость:** ${totalPrice} <:steamworkshop_collection_8776158:1423962802640650351>\n**Статус:** ⏳ Ожидает подтверждения\n**Ветка:** ${deal.threadId ? `<#${deal.threadId}>` : 'Не создана'}`,
        inline: false,
      });
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({
      embeds: [embed],
    });
  }

  async handleListingPagination(interaction) {
    const [, action, page] = interaction.customId.split('_');
    const pageNum = parseInt(page);
    
    const { listings, total, totalPages } = await this.listingService.getActiveListings('', pageNum);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ПОКУПКА ТОВАРОВ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Найдено ${total} активных лотов. Страница ${pageNum} из ${totalPages}`)
      .setTimestamp();

    const components = [];
    
    if (listings.length > 0) {
      components.push(createListingSelectMenu(listings));
    }

    const paginationRow = createPaginationButtons(pageNum, totalPages, 'listing');
    if (paginationRow) {
      components.push(paginationRow);
    }

    await interaction.update({
      embeds: [embed],
      components,
    });
  }

  async handleDealsPagination(interaction) {
    const [, action, page] = interaction.customId.split('_');
    const pageNum = parseInt(page);
    
    const { deals, total, totalPages } = await this.dealService.getUserDealHistory(interaction.user.id, pageNum);

    const embed = new EmbedBuilder()
      .setTitle(`\`\`\`${TEXTS.DEALS.HISTORY_TITLE}\`\`\``)
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`Найдено ${total} завершённых сделок. Страница ${pageNum} из ${totalPages}`)
      .setTimestamp();

    for (const deal of deals.slice(0, 5)) {
      const totalPrice = deal.price * deal.quantity;
      embed.addFields({
        name: `Сделка #${deal.id}`,
        value: `**Товар**\n> ${deal.itemName}\n\n**Количество**\n> ${deal.quantity}\n\n**Цена**\n> ${deal.price} <:steamworkshop_collection_8776158:1423962802640650351> за единицу\n\n**Общая стоимость**\n> ${totalPrice} <:steamworkshop_collection_8776158:1423962802640650351>\n\n**Продавец**\n> <@${deal.seller.discordId}>\n\n**Покупатель**\n> <@${deal.buyer.discordId}>\n\n**Дата**\n> <t:${Math.floor(new Date(deal.createdAt).getTime() / 1000)}:R>`,
        inline: false,
      });
    }

    const components = [];
    const paginationRow = createPaginationButtons(pageNum, totalPages, 'deals');
    if (paginationRow) {
      components.push(paginationRow);
    }

    await interaction.update({
      embeds: [embed],
      components,
    });
  }

  async handleMarketHelpButton(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СПРАВКА ПО БОТУ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Руководство по использованию торгового бота`)
        .setThumbnail('https://cdn.discordapp.com/attachments/1423960996547924009/1423984166932054086/679.png?ex=68e24c19&is=68e0fa99&hm=627d7617ef9448e8a2e8c1500d2b8beb0bbab74e552ac55ff0e8e240d87e9182&')
        .setColor(0x7b9e1e)
        .addFields(
          {
            name: '```<:3465:1423975798049738832> Команда /market```',
            value: `**Покупка товаров**
> Выберите товар из списка
> Создаётся приватная ветка для обсуждения
> Подтвердите сделку в ветке

**Продажа товаров**
> Заполните форму создания лота
> Выберите категорию товара
> Лот становится активным на рынке

**Управление сделками**
> Просмотр активных сделок
> История завершённых сделок
> Управление своими сделками`,
            inline: false,
          },
          {
            name: '```<:2_:1423965583963328633> Команда /auction```',
            value: `**Создание аукциона**
> Только пользователи с ролью аукционера
> \`/auction create <товар> <длительность> <мин_цена>\`
> Автоматически создаётся обсуждение в форуме
> Аукцион завершается автоматически

**Участие в аукционе**
> \`/auction bid <ID> <ставка>\` или кнопка "Поставить ставку"
> Ставка должна быть выше текущей
> Сообщение в треде обновляется после каждой ставки
> Победитель определяется автоматически

**Просмотр аукционов**
> \`/auction list\` - список активных аукционов
> \`/auction info <ID>\` - информация об аукционе
> В треде отображается текущая максимальная ставка`,
            inline: false,
          },
          {
            name: '```<:679:1423974435228225556> Админ команды```',
            value: `**Управление рынком**
> \`/admin market-setup\` - создать постоянное сообщение рынка
> \`/admin market-update\` - обновить сообщение рынка
> \`/admin cleanup\` - удалить неактивные лоты и аукционы

**Просмотр статистики**
> \`/admin stats\` - статистика рынка и аукционов
> \`/admin auction-logs\` - логи завершённых аукционов
> Показывает победителей и суммы выигрыша

**Очистка данных**
> \`/admin cleanup listings\` - удалить неактивные лоты
> \`/admin cleanup auctions\` - удалить завершённые аукционы
> \`/admin cleanup deals\` - удалить закрытые сделки`,
            inline: false,
          },
          {
            name: '```Категории товаров```',
            value: `**Доступные категории**
> Оружие • Снаряжение • Зелья • Еда
> Ингредиенты • Рыба • Мясо • Слитки
> Книги • Драгоценности • Ювелирные изделия
> Шкуры • Магическое • Сосуды • Алкоголь • Руда

**Фильтрация по категориям**
> Выберите категорию в меню покупки
> Товары будут отсортированы по выбранной категории`,
            inline: false,
          },
          {
            name: '```<:679:1423974435228225556> Полезные советы```',
            value: `**Для покупателей**
> Используйте фильтр по категориям для быстрого поиска
> Проверяйте изображения товаров
> Общайтесь с продавцом в приватной ветке

**Для продавцов**
> Выбирайте правильную категорию из списка
> Указывайте точное количество товара
> Создание лота происходит в два этапа

**Для аукционеров**
> Создавайте интересные аукционы
> Устанавливайте разумные минимальные цены
> Следите за активностью участников в тредах

**Для администраторов**
> Используйте \`/admin cleanup\` для очистки старых данных
> Проверяйте логи аукционов через \`/admin auction-logs\`
> Настройте постоянное сообщение рынка`,
            inline: false,
          }
        )
        .setTimestamp()
        .setFooter({ 
          text: `Запрошено: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        });

    await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error in market help:', error);
      await interaction.reply({
        content: '<:679:1423974435228225556> Ошибка при получении справки',
        ephemeral: true,
      });
    }
  }

  async handleMarketSearchButton(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ПОИСК ПО КАТЕГОРИЯМ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Выберите категорию для просмотра товаров`)
        .setThumbnail('https://cdn.discordapp.com/attachments/1423960996547924009/1423984165761843330/3.png?ex=68e24c19&is=68e0fa99&hm=0d0ae1f636acb34b932c20f45c381a75b5a973a6b725de85574d19594c414965&')
        .setColor(0x7b9e1e)
        .setTimestamp()
        .setFooter({ 
          text: `Пользователь: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      const components = [createCategorySelectMenu()];

    await interaction.editReply({
      embeds: [embed],
      components: components,
    });
    } catch (error) {
      console.error('Error in market search:', error);
      await interaction.editReply({
        content: '<:679:1423974435228225556> Ошибка при получении информации о поиске',
      });
    }
  }

  async handleError(interaction, error) {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: TEXTS.ERRORS.INTERNAL_ERROR,
        });
      } else {
        await interaction.reply({
          content: TEXTS.ERRORS.INTERNAL_ERROR,
          ephemeral: true,
        });
      }
    } catch (followUpError) {
      console.error('Error in error handler:', followUpError);
    }
  }

  async handleMarketStatsButton(interaction) {
    try {
      const [listingStats, auctionStats] = await Promise.all([
        this.listingService.getListingStats(),
        this.auctionService.getAuctionStats(),
      ]);

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.INFO)
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СТАТИСТИКА РЫНКА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
        .setThumbnail('https://cdn.discordapp.com/attachments/1423960996547924009/1423984163157180467/56.png?ex=68e24c18&is=68e0fa98&hm=85b93e15cb8a412921217213256a9435e733169aebf2839eafe38bbda548fdae&')
        .addFields(
          {
            name: '**Лоты**',
            value: `**Активных**\n> ${listingStats.active}\n\n**Всего**\n> ${listingStats.total || 0}\n\n**Завершённых**\n> ${(listingStats.total || 0) - listingStats.active}`,
            inline: true,
          },
          {
            name: '**Аукционы**',
            value: `**Активных**\n> ${auctionStats.scheduled}\n\n**Завершённых**\n> ${auctionStats.completed || 0}\n\n**Всего ставок**\n> ${auctionStats.totalBids || 0}`,
            inline: true,
          },
          {
            name: '**Активность**',
            value: `**Пользователей**\n> ${auctionStats.users || 0}\n\n**Средняя ставка**\n> ${auctionStats.avgBid || 0} <:steamworkshop_collection_8776158:1423962802640650351>\n\n**Общий оборот**\n> ${auctionStats.totalVolume || 0} <:steamworkshop_collection_8776158:1423962802640650351>`,
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({ 
          text: `Пользователь: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error in market stats:', error);
      await interaction.reply({
        content: '<:679:1423974435228225556> Ошибка при получении статистики',
        ephemeral: true,
      });
    }
  }

  async handleAuctionBidButton(interaction) {
    try {
      const auctionId = interaction.customId.replace('auction_bid_', '');
      console.log(`[BUTTON HANDLER] Auction bid button clicked for auction ${auctionId} by user ${interaction.user.id} (${interaction.user.username})`);
      
      // Create modal for bid amount
      const modal = new ModalBuilder()
        .setCustomId(`auction_bid_modal_${auctionId}`)
        .setTitle('Поднять ставку')
        .addComponents(
          new ActionRowBuilder()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('bid_amount')
                .setLabel('Сумма ставки')
                .setPlaceholder('Введите сумму ставки')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(10)
            )
        );

      console.log(`[BUTTON HANDLER] Showing modal for auction ${auctionId}`);
      await interaction.showModal(modal);
    } catch (error) {
      console.error('[BUTTON HANDLER] Error showing auction bid modal:', error);
      console.error('[BUTTON HANDLER] Error stack:', error.stack);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '<:679:1423974435228225556> Ошибка при открытии формы ставки',
          ephemeral: true,
        });
      }
    }
  }

  async handleAuctionWithdrawButton(interaction) {
    try {
      const auctionId = interaction.customId.replace('auction_withdraw_', '');
      
      const embed = new EmbedBuilder()
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ОТКАЗ ОТ УЧАСТИЯ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Вы отказались от участия в аукционе`)
        .setColor(0x7b9e1e)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error handling auction withdraw:', error);
      await interaction.reply({
        content: '<:679:1423974435228225556> Ошибка при отказе от участия',
        ephemeral: true,
      });
    }
  }

}
