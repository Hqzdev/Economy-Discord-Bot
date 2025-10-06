import { ModalSubmitInteraction, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { DealService } from '../services/simpleDealService.js';
import { AuctionService } from '../services/simpleAuctionService.js';
import { UserService } from '../services/simpleUserService.js';
import { AuditService } from '../services/simpleAuditService.js';
import { createListingEmbed } from '../ui/components.js';

export class ModalHandler {
  constructor() {
    this.listingService = new ListingService();
    this.dealService = new DealService();
    this.auctionService = new AuctionService();
    this.userService = new UserService();
    this.auditService = new AuditService();
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
      const { customId } = interaction;

      if (customId === UI_CONSTANTS.MODAL_IDS.SELL_ITEM) {
        await this.handleSellModal(interaction);
      } else if (customId === UI_CONSTANTS.MODAL_IDS.CHANGE_QUANTITY) {
        await this.handleChangeQuantityModal(interaction);
      } else if (customId.startsWith('auction_bid_modal_')) {
        await this.handleAuctionBidModal(interaction);
      }

    } catch (error) {
      console.error('Error in modal handler:', error);
      await this.handleError(interaction, error);
    }
  }

  async handleSellModal(interaction) {
    const itemName = interaction.fields.getTextInputValue('item_name').trim();
    const priceStr = interaction.fields.getTextInputValue('price').trim();
    const quantityStr = interaction.fields.getTextInputValue('quantity').trim();
    const category = interaction.fields.getTextInputValue('category')?.trim() || null;

    // Validate inputs
    const price = parseInt(priceStr);
    const quantity = parseInt(quantityStr);

    // Validate category
    if (!category || !UI_CONSTANTS.CATEGORIES.includes(category)) {
      await interaction.reply({
        content: `❌ Неверная категория. Доступные категории:\n${UI_CONSTANTS.CATEGORIES.join(', ')}`,
        ephemeral: true,
      });
      return;
    }

    if (isNaN(price) || price <= 0) {
      await interaction.reply({
        content: TEXTS.ERRORS.INVALID_PRICE,
        ephemeral: true,
      });
      return;
    }

    if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      await interaction.reply({
        content: TEXTS.ERRORS.INVALID_QUANTITY,
        ephemeral: true,
      });
      return;
    }

    try {
      // Create listing
      const listing = await this.listingService.createListing(interaction.user.id, itemName, price, quantity, null, category);

      // Log action
      await this.auditService.logAction(interaction.user.id, 'LISTING_CREATED', {
        listingId: listing.id,
        itemName,
        price,
        quantity,
      });

      // Create listing embed
      const embed = createListingEmbed(listing);

      await interaction.reply({
        content: TEXTS.SUCCESS.LISTING_CREATED,
        embeds: [embed],
        ephemeral: true,
      });

    } catch (error) {
      if (error.message === 'Insufficient stock') {
        await interaction.reply({
          content: TEXTS.ERRORS.INSUFFICIENT_STOCK,
          ephemeral: true,
        });
      } else {
        throw error;
      }
    }
  }

  async handleChangeQuantityModal(interaction) {
    const newQuantityStr = interaction.fields.getTextInputValue('new_quantity').trim();
    const newQuantity = parseInt(newQuantityStr);

    if (isNaN(newQuantity) || newQuantity <= 0 || !Number.isInteger(newQuantity)) {
      await interaction.reply({
        content: TEXTS.ERRORS.INVALID_QUANTITY,
        ephemeral: true,
      });
      return;
    }

    // Find the deal ID from the interaction context
    // This is a simplified approach - in a real implementation, you might want to store this in a different way
    const dealId = interaction.customId.split('_').pop();
    
    if (!dealId) {
      await interaction.reply({
        content: 'Не удалось определить сделку',
        ephemeral: true,
      });
      return;
    }

    try {
      await this.dealService.updateDealQuantity(dealId, newQuantity, interaction.user.id);

      // Log action
      await this.auditService.logAction(interaction.user.id, 'DEAL_QUANTITY_CHANGED', {
        dealId,
        newQuantity,
      });

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.SUCCESS)
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ КОЛИЧЕСТВО ИЗМЕНЕНО ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Количество в сделке #${dealId} изменено на ${newQuantity}`)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

    } catch (error) {
      if (error.message === 'Only buyer can change the quantity') {
        await interaction.reply({
          content: TEXTS.ERRORS.ONLY_BUYER_CONTROL,
          ephemeral: true,
        });
      } else if (error.message.includes('Insufficient quantity')) {
        await interaction.reply({
          content: error.message,
          ephemeral: true,
        });
      } else {
        throw error;
      }
    }
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
      console.error('Error in modal error handler:', followUpError);
    }
  }

  async handleAuctionBidModal(interaction) {
    try {
      const auctionId = interaction.customId.replace('auction_bid_modal_', '');
      const bidAmountStr = interaction.fields.getTextInputValue('bid_amount');
      const bidAmount = parseInt(bidAmountStr);

      console.log(`[MODAL HANDLER] Auction bid modal submitted for auction ${auctionId} by user ${interaction.user.id} (${interaction.user.username})`);
      console.log(`[MODAL HANDLER] Bid amount string: "${bidAmountStr}", parsed: ${bidAmount}`);

      if (isNaN(bidAmount) || bidAmount <= 0) {
        console.error(`[MODAL HANDLER] Invalid bid amount: ${bidAmount} (from string: "${bidAmountStr}")`);
        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: '❌ Неверная сумма ставки',
            ephemeral: true,
          });
        }
        return;
      }

      // Set client for auction service
      this.auctionService.setClient(interaction.client);

      // Get user and make bid
      const user = await this.userService.getOrCreateUser(interaction.user.id);
      console.log(`[MODAL HANDLER] User object:`, { id: user.id, discordId: user.discordId, username: user.username });
      
      const bid = await this.auctionService.makeBid(auctionId, user.id, bidAmount);
      console.log(`[MODAL HANDLER] Bid created successfully:`, { bidId: bid.id, amount: bid.amount, auctionId });

      // Log action
      await this.auditService.logAction(interaction.user.id, 'AUCTION_BID', {
        auctionId,
        amount: bidAmount,
        bidId: bid.id,
      });

      const embed = new EmbedBuilder()
        .setColor(0x7b9e1e)
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СТАВКА СДЕЛАНА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Ставка ${bidAmount}  сделана в аукционе #${auctionId}`)
        .addFields(
          {
            name: 'Сумма ставки',
            value: `${bidAmount} `,
            inline: true,
          },
          {
            name: 'ID ставки',
            value: bid.id,
            inline: true,
          }
        )
        .setTimestamp();

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }

    } catch (error) {
      console.error('[MODAL HANDLER] Error in auction bid modal:', error);
      console.error('[MODAL HANDLER] Error stack:', error.stack);
      console.error('[MODAL HANDLER] Auction ID:', interaction.customId.replace('auction_bid_modal_', ''));
      console.error('[MODAL HANDLER] User:', { id: interaction.user.id, username: interaction.user.username });
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Ошибка при создании ставки',
          ephemeral: true,
        });
      }
    }
  }
}
