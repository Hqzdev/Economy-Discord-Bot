import { ModalSubmitInteraction, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { DealService } from '../services/simpleDealService.js';
import { AuditService } from '../services/simpleAuditService.js';
import { createListingEmbed } from '../ui/components.js';

export class ModalHandler {
  constructor() {
    this.listingService = new ListingService();
    this.dealService = new DealService();
    this.auditService = new AuditService();
  }

  async handle(interaction) {
    try {
      const { customId } = interaction;

      if (customId === UI_CONSTANTS.MODAL_IDS.SELL_ITEM) {
        await this.handleSellModal(interaction);
      } else if (customId === UI_CONSTANTS.MODAL_IDS.CHANGE_QUANTITY) {
        await this.handleChangeQuantityModal(interaction);
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

    // Validate inputs
    const price = parseInt(priceStr);
    const quantity = parseInt(quantityStr);

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
      const listing = await this.listingService.createListing(interaction.user.id, itemName, price, quantity);

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
        ephemeral: false,
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
        .setTitle('✅ Количество изменено')
        .setColor(EMBED_COLORS.SUCCESS)
        .setDescription(`Количество в сделке #${dealId} изменено на ${newQuantity}`)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
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
}
