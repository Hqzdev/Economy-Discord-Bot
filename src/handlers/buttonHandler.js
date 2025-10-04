import { 
  ButtonInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
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
  createListingEmbed
} from '../ui/components.js';

export class ButtonHandler {
  constructor() {
    this.listingService = new ListingService();
    this.dealService = new DealService();
    this.auctionService = new AuctionService();
    this.auditService = new AuditService();
    this.userService = new UserService();
  }

  async handle(interaction) {
    try {
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
      await interaction.reply({
        content: TEXTS.BUY.NO_LISTINGS,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(TEXTS.BUY.TITLE)
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`Найдено ${total} активных лотов. Страница ${page} из ${totalPages}`)
      .setTimestamp();

    const components = [];
    
    if (listings.length > 0) {
      components.push(createListingSelectMenu(listings));
    }

    const paginationRow = createPaginationButtons(page, totalPages, 'listing');
    if (paginationRow) {
      components.push(paginationRow);
    }

    await interaction.reply({
      embeds: [embed],
      components,
      ephemeral: true,
    });
  }

  async handleSellButton(interaction) {
    const modal = createSellModal();
    await interaction.showModal(modal);
  }

  async handleAuctionButton(interaction) {
    const auctions = await this.auctionService.getActiveAuctions();

    const embed = new EmbedBuilder()
      .setTitle(TEXTS.AUCTION.TITLE)
      .setColor(EMBED_COLORS.INFO)
      .setTimestamp();

    if (auctions.length === 0) {
      embed.setDescription(TEXTS.AUCTION.NO_AUCTIONS);
    } else {
      embed.setDescription(`Найдено ${auctions.length} активных аукционов:`);
      
      for (const auction of auctions.slice(0, 10)) {
        embed.addFields({
          name: `🔨 ${auction.itemName}`,
          value: `**Время начала:** <t:${Math.floor(auction.startTime.getTime() / 1000)}:F>\n**Создатель:** <@${auction.creator.discordId}>${auction.description ? `\n**Описание:** ${auction.description}` : ''}`,
          inline: false,
        });
      }
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  async handleDealsButton(interaction) {
    const row = createDealsMenuButtons();
    
    const embed = new EmbedBuilder()
      .setTitle(TEXTS.DEALS.TITLE)
      .setDescription('Выберите действие:')
      .setColor(EMBED_COLORS.PRIMARY)
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
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
          .setTitle('✅ Сделка завершена!')
          .setColor(EMBED_COLORS.SUCCESS)
          .setDescription(`Сделка #${dealId} успешно завершена обеими сторонами!`)
          .addFields(
            {
              name: 'Товар',
              value: deal.itemName,
              inline: true,
            },
            {
              name: 'Количество',
              value: deal.quantity.toString(),
              inline: true,
            },
            {
              name: 'Цена в игре',
              value: `${deal.price * deal.quantity} монет`,
              inline: true,
            },
            {
              name: 'Важно',
              value: 'Переведите деньги в игре продавцу',
              inline: false,
            }
          )
          .setTimestamp();
      } else {
        embed = new EmbedBuilder()
          .setTitle('✅ Подтверждение получено')
          .setColor(EMBED_COLORS.PRIMARY)
          .setDescription(`Вы (${userRole}) подтвердили сделку #${dealId}`)
          .addFields(
            {
              name: 'Статус',
              value: isBuyer ? 
                (deal.sellerConfirmed ? '✅ Продавец подтвердил' : '⏳ Ожидает подтверждения продавца') :
                (deal.buyerConfirmed ? '✅ Покупатель подтвердил' : '⏳ Ожидает подтверждения покупателя'),
              inline: false,
            }
          )
          .setTimestamp();
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
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
        await interaction.reply({
          content: `❌ Ошибка: ${error.message}`,
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: `❌ Ошибка: ${error.message}`,
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
      .setTitle('❌ Сделка отменена')
      .setColor(EMBED_COLORS.ERROR)
      .setDescription(`Сделка #${dealId} отменена`)
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
      await interaction.reply({
        content: TEXTS.ERRORS.ONLY_BUYER_CONTROL,
        ephemeral: true,
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
      await interaction.reply({
        content: 'Только участники сделки могут её закрыть',
        ephemeral: true,
      });
      return;
    }

    const closedDeal = await this.dealService.closeDeal(dealId, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('🔒 Сделка закрыта')
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`Сделка #${dealId} закрыта участником`)
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
      .setTitle(TEXTS.DEALS.HISTORY_TITLE)
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`Найдено ${total} завершённых сделок. Страница ${page} из ${totalPages}`)
      .setTimestamp();

    for (const deal of deals.slice(0, 5)) {
      const totalPrice = deal.price * deal.quantity;
      embed.addFields({
        name: `Сделка #${deal.id}`,
        value: `**Товар:** ${deal.itemName}\n**Количество:** ${deal.quantity}\n**Цена:** ${deal.price} монет за единицу\n**Общая стоимость:** ${totalPrice} монет\n**Продавец:** <@${deal.seller.discordId}>\n**Покупатель:** <@${deal.buyer.discordId}>\n**Дата:** <t:${Math.floor(new Date(deal.createdAt).getTime() / 1000)}:R>`,
        inline: false,
      });
    }

    const components = [];
    const paginationRow = createPaginationButtons(page, totalPages, 'deals');
    if (paginationRow) {
      components.push(paginationRow);
    }

    await interaction.reply({
      embeds: [embed],
      components,
      ephemeral: true,
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
      .setTitle(TEXTS.DEALS.ACTIVE_TITLE)
      .setColor(EMBED_COLORS.WARNING)
      .setDescription(`У вас ${deals.length} активных сделок:`)
      .setTimestamp();

    // Get internal user ID for comparison
    const user = await this.userService.getOrCreateUser(interaction.user.id);
    
    for (const deal of deals.slice(0, 10)) {
      const totalPrice = deal.price * deal.quantity;
      const role = deal.buyerId === user.id ? 'Покупатель' : 'Продавец';
      
      embed.addFields({
        name: `Сделка #${deal.id} (${role})`,
        value: `**Товар:** ${deal.itemName}\n**Количество:** ${deal.quantity}\n**Общая стоимость:** ${totalPrice} монет\n**Статус:** ⏳ Ожидает подтверждения\n**Ветка:** ${deal.threadId ? `<#${deal.threadId}>` : 'Не создана'}`,
        inline: false,
      });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  async handleListingPagination(interaction) {
    const [, action, page] = interaction.customId.split('_');
    const pageNum = parseInt(page);
    
    const { listings, total, totalPages } = await this.listingService.getActiveListings('', pageNum);

    const embed = new EmbedBuilder()
      .setTitle(TEXTS.BUY.TITLE)
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`Найдено ${total} активных лотов. Страница ${pageNum} из ${totalPages}`)
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
      .setTitle(TEXTS.DEALS.HISTORY_TITLE)
      .setColor(EMBED_COLORS.INFO)
      .setDescription(`Найдено ${total} завершённых сделок. Страница ${pageNum} из ${totalPages}`)
      .setTimestamp();

    for (const deal of deals.slice(0, 5)) {
      const totalPrice = deal.price * deal.quantity;
      embed.addFields({
        name: `Сделка #${deal.id}`,
        value: `**Товар:** ${deal.itemName}\n**Количество:** ${deal.quantity}\n**Цена:** ${deal.price} монет за единицу\n**Общая стоимость:** ${totalPrice} монет\n**Продавец:** <@${deal.seller.discordId}>\n**Покупатель:** <@${deal.buyer.discordId}>\n**Дата:** <t:${Math.floor(new Date(deal.createdAt).getTime() / 1000)}:R>`,
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

  async handleError(interaction, error) {
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: TEXTS.ERRORS.INTERNAL_ERROR,
          ephemeral: true,
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
}
