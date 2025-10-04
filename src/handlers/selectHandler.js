import { StringSelectMenuInteraction, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { DealService } from '../services/simpleDealService.js';
import { AuditService } from '../services/simpleAuditService.js';
import { UserService } from '../services/simpleUserService.js';
import { createDealControlButtons, createDealEmbed, createDealThreadEmbed } from '../ui/components.js';
import logger from '../utils/logger.js';

export class SelectHandler {
  constructor() {
    this.listingService = new ListingService();
    this.dealService = new DealService();
    this.auditService = new AuditService();
    this.userService = new UserService();
  }

  async handle(interaction) {
    try {
      const { customId } = interaction;

      if (customId === UI_CONSTANTS.SELECT_IDS.LISTING_SELECT) {
        await this.handleListingSelect(interaction);
      }

    } catch (error) {
      console.error('Error in select handler:', error);
      await this.handleError(interaction, error);
    }
  }

  async handleListingSelect(interaction) {
    const listingId = interaction.values[0];
    
    // Get listing details
    const listing = await this.listingService.getListingById(listingId);
    if (!listing || listing.status !== 'ACTIVE') {
      await interaction.reply({
        content: TEXTS.ERRORS.LISTING_NOT_FOUND,
        ephemeral: true,
      });
      return;
    }

    // Check if user is trying to buy from themselves
    if (listing.seller && listing.seller.discordId === interaction.user.id) {
      await interaction.reply({
        content: '❌ Вы не можете купить товар у самого себя',
        ephemeral: true,
      });
      return;
    }

    // Create deal with initial quantity of 1
    const initialQuantity = 1;
    
    try {
      // Create private thread for the deal
      const thread = await interaction.channel.threads.create({
        name: `Сделка ${listing.itemName}`,
        type: ChannelType.PrivateThread,
        reason: 'Создание сделки на рынке',
      });

      // Invite participants
      await thread.members.add(interaction.user.id);
      await thread.members.add(listing.seller.discordId);

      // Create deal
      const deal = await this.dealService.createDeal(listingId, interaction.user.id, initialQuantity, thread.id);

      // Set up auto-delete after 1 minute of inactivity
      setTimeout(async () => {
        try {
          // Check if thread still exists and has no recent messages
          const messages = await thread.messages.fetch({ limit: 1 });
          const lastMessage = messages.first();
          const now = Date.now();
          const oneMinuteAgo = now - 60000; // 1 minute in milliseconds
          
          // If no messages or last message is older than 1 minute, delete thread
          if (!lastMessage || lastMessage.createdTimestamp < oneMinuteAgo) {
            await thread.delete('Автоматическое удаление неактивной ветки сделки');
            logger.info(`Auto-deleted inactive deal thread: ${thread.id}`);
          }
        } catch (error) {
          // Thread might already be deleted, ignore error
          logger.info(`Thread ${thread.id} already deleted or inaccessible`);
        }
      }, 60000); // 1 minute

      // Log action
      await this.auditService.logAction(interaction.user.id, 'DEAL_CREATED', {
        dealId: deal.id,
        listingId,
        quantity: initialQuantity,
        threadId: thread.id,
      });

      // Create deal embed and controls
      const dealEmbed = createDealThreadEmbed(deal, listing);
      
      // Get internal user ID for buyer
      const buyerUser = await this.userService.getOrCreateUser(interaction.user.id);
      const controlRow = createDealControlButtons(deal, buyerUser.id);

      // Send initial message in thread
      const messageOptions = {
        content: `<@${interaction.user.id}> <@${listing.seller.discordId}>`,
        embeds: [dealEmbed],
      };

      // Only add components if controlRow is not null
      if (controlRow) {
        messageOptions.components = [controlRow];
      }

      await thread.send(messageOptions);

      // Reply to the selection
      await interaction.reply({
        content: `✅ Сделка создана! Проверьте приватную ветку: <#${thread.id}>`,
        ephemeral: true,
      });

    } catch (error) {
      if (error.message === 'Maximum active deals limit reached') {
        await interaction.reply({
          content: TEXTS.ERRORS.MAX_DEALS_EXCEEDED,
          ephemeral: true,
        });
      } else if (error.message.includes('Insufficient quantity')) {
        await interaction.reply({
          content: error.message,
          ephemeral: true,
        });
      } else if (error.message === 'Cannot buy from yourself') {
        await interaction.reply({
          content: '❌ Вы не можете купить товар у самого себя',
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
      console.error('Error in select error handler:', followUpError);
    }
  }
}
