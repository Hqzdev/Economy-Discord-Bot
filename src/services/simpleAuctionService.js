import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';
import { UserService } from './simpleUserService.js';

export class AuctionService {
  constructor() {
    this.userService = new UserService();
    this.client = null;
    this.persistentMarketService = null;
  }

  setClient(client) {
    this.client = client;
  }

  setPersistentMarketService(service) {
    this.persistentMarketService = service;
  }

  async createAuction(creatorDiscordId, itemName, startTime, endTime, minPrice, description = null, category = null, imageUrl = null) {
    try {
      // Validate times
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      if (endDate <= startDate) {
        throw new Error('End time must be after start time');
      }

      if (minPrice <= 0) {
        throw new Error('Minimum price must be greater than 0');
      }

      // Get or create user
      const user = await this.userService.getOrCreateUser(creatorDiscordId);

      const auction = db.createAuction(creatorDiscordId, itemName, startDate, endDate, minPrice, description, category, imageUrl);
      logger.info(`Created auction ${auction.id} for ${itemName} by user ${creatorDiscordId}`);
      
      // Мгновенное обновление рынка
      if (this.persistentMarketService) {
        this.persistentMarketService.delayedUpdate(1000);
      }
      
      return auction;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  }

  async makeBid(auctionId, bidderInternalId, amount) {
    try {
      console.log(`[AUCTION SERVICE] makeBid called with auctionId: ${auctionId}, bidderInternalId: ${bidderInternalId}, amount: ${amount}`);
      
      // Get user by internal ID
      const user = await this.userService.getUserById(bidderInternalId);
      console.log(`[AUCTION SERVICE] User found:`, { id: user?.id, discordId: user?.discordId, username: user?.username });
      
      if (!user) {
        console.error(`[AUCTION SERVICE] User not found for internal ID: ${bidderInternalId}`);
        throw new Error('User not found');
      }

      console.log(`[AUCTION SERVICE] Creating bid in database...`);
      const bid = db.createBid(auctionId, bidderInternalId, amount);
      console.log(`[AUCTION SERVICE] Bid created:`, { bidId: bid.id, amount: bid.amount, auctionId: bid.auctionId });
      
      logger.info(`Created bid ${bid.id} for auction ${auctionId} by user ${user.discordId} for ${amount} coins`);
      
      // Update forum thread embed
      await this.updateAuctionForumEmbed(auctionId);
      
      // Мгновенное обновление рынка
      if (this.persistentMarketService) {
        this.persistentMarketService.delayedUpdate(1000);
      }
      
      return bid;
    } catch (error) {
      console.error(`[AUCTION SERVICE] Error making bid:`, error);
      console.error(`[AUCTION SERVICE] Error stack:`, error.stack);
      logger.error('Error making bid:', error);
      throw error;
    }
  }

  async getActiveAuctions() {
    try {
      return db.getActiveAuctions();
    } catch (error) {
      logger.error('Error getting active auctions:', error);
      throw error;
    }
  }

  async getAuctionInfo(auctionId) {
    try {
      const auction = db.data.auctions.get(auctionId);
      if (!auction) {
        return null;
      }

      // Get creator - сначала по Discord ID, потом по внутреннему ID
      let creator = db.getUserByDiscordId(auction.creatorId);
      if (!creator) {
        // Fallback: попробуем найти по внутреннему ID
        creator = db.data.users.get(auction.creatorId);
      }
      if (!creator) {
        console.error(`Creator not found for auction ${auctionId}, creatorId: ${auction.creatorId}`);
        return null;
      }

      return {
        ...auction,
        startTime: new Date(auction.startTime),
        endTime: new Date(auction.endTime),
        creator: creator
      };
    } catch (error) {
      logger.error('Error getting auction info:', error);
      throw error;
    }
  }

  async getAuctionBids(auctionId) {
    try {
      return db.getAuctionBids(auctionId);
    } catch (error) {
      logger.error('Error getting auction bids:', error);
      throw error;
    }
  }

  async getAuctionById(auctionId) {
    try {
      // Simple implementation - would need to add this method to jsonDb
      const auctions = db.getActiveAuctions();
      return auctions.find(a => a.id === auctionId) || null;
    } catch (error) {
      logger.error('Error getting auction by ID:', error);
      throw error;
    }
  }

  async closeAuction(auctionId) {
    try {
      // Simple implementation - would need to add this method to jsonDb
      logger.info(`Closed auction ${auctionId}`);
      return { id: auctionId, status: 'CLOSED' };
    } catch (error) {
      logger.error('Error closing auction:', error);
      throw error;
    }
  }

  async getAuctionStats() {
    try {
      const auctions = db.getActiveAuctions();
      return {
        scheduled: auctions.length,
        closed: 0, // Simplified
        total: auctions.length,
      };
    } catch (error) {
      logger.error('Error getting auction stats:', error);
      throw error;
    }
  }

  async getUserAuctions(userInternalId) {
    try {
      const allAuctions = Array.from(db.data.auctions.values());
      
      // Get auctions created by user
      const createdAuctions = allAuctions.filter(auction => auction.creatorId === userInternalId);
      
      // Get auctions where user participated (made bids)
      const userBids = Array.from(db.data.bids.values()).filter(bid => bid.bidderId === userInternalId);
      const participatedAuctionIds = [...new Set(userBids.map(bid => bid.auctionId))];
      const participatedAuctions = allAuctions.filter(auction => participatedAuctionIds.includes(auction.id));
      
      // Combine and deduplicate
      const allUserAuctions = [...createdAuctions, ...participatedAuctions];
      const uniqueAuctions = allUserAuctions.filter((auction, index, self) => 
        index === self.findIndex(a => a.id === auction.id)
      );
      
      return uniqueAuctions.map(auction => ({
        ...auction,
        startTime: new Date(auction.startTime),
        endTime: new Date(auction.endTime),
        creator: db.data.users.get(auction.creatorId)
      }));
    } catch (error) {
      logger.error('Error getting user auctions:', error);
      throw error;
    }
  }

  async updateAuctionForumEmbed(auctionId) {
    try {
      console.log(`[AUCTION SERVICE] updateAuctionForumEmbed called for auction ${auctionId}`);
      
      if (!this.client) {
        console.log(`[AUCTION SERVICE] No client available for updating embed`);
        return;
      }

      const auction = db.data.auctions.get(auctionId);
      console.log(`[AUCTION SERVICE] Auction found:`, { id: auction?.id, threadId: auction?.threadId, status: auction?.status });
      
      if (!auction || !auction.threadId) {
        console.log(`[AUCTION SERVICE] Auction not found or no threadId`);
        return;
      }

      // Get creator info
      const creator = db.data.users.get(auction.creatorId);
      if (!creator) {
        console.log(`[AUCTION SERVICE] Creator not found for auction ${auctionId}`);
        return;
      }

      const thread = await this.client.channels.fetch(auction.threadId);
      console.log(`[AUCTION SERVICE] Thread found:`, { id: thread?.id, type: thread?.type });
      
      if (!thread) {
        console.log(`[AUCTION SERVICE] Thread not found`);
        return;
      }

      const bids = db.getAuctionBids(auctionId);
      console.log(`[AUCTION SERVICE] Bids found:`, { count: bids.length, bids: bids.map(b => ({ id: b.id, amount: b.amount, bidder: b.bidder?.discordId })) });
      
      const highestBid = bids.length > 0 ? bids[0] : null;

      const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');

      const embed = new EmbedBuilder()
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АУКЦИОН: ${auction.itemName} ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
        .setColor(0x7b9e1e)
        .addFields(
          {
            name: '**ID аукциона**',
            value: `> \`${auction.id}\``,
            inline: true,
          },
          {
            name: '**Категория**',
            value: `> ${auction.category || 'Не указана'}`,
            inline: true,
          },
          {
            name: '**Создатель**',
            value: `> <@${creator.discordId}>`,
            inline: true,
          },
          {
            name: '**Мин. стоимость**',
            value: `> ${auction.minPrice} <:steamworkshop_collection_8776158:1423962802640650351>`,
            inline: true,
          },
          {
            name: '**Завершится**',
            value: `> <t:${Math.floor(new Date(auction.endTime).getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: '**Ставок**',
            value: `> ${bids.length}`,
            inline: true,
          },
          {
            name: '**Текущая ставка**',
            value: highestBid ? `> ${highestBid.amount} <:steamworkshop_collection_8776158:1423962802640650351> от <@${highestBid.bidder.discordId}>` : '> Нет ставок',
            inline: true,
          }
        )
        .setTimestamp();

      if (auction.imageUrl) {
        embed.setImage(auction.imageUrl);
      }

      if (auction.description) {
        embed.addFields({
          name: '**Описание**',
          value: `> ${auction.description}`,
          inline: false,
        });
      }

      const bidButton = new ButtonBuilder()
        .setCustomId(`auction_bid_${auction.id}`)
        .setLabel('Поставить ставку')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('<:3465:1423975798049738832>');

      const components = [new ActionRowBuilder().addComponents(bidButton)];

      // Update the first message in the thread
      const messages = await thread.messages.fetch({ limit: 1 });
      const firstMessage = messages.first();
      console.log(`[AUCTION SERVICE] First message found:`, { id: firstMessage?.id, hasContent: !!firstMessage?.content });
      
      if (firstMessage) {
        await firstMessage.edit({
          embeds: [embed],
          components,
        });
        console.log(`[AUCTION SERVICE] Successfully updated auction forum embed for auction ${auctionId}`);
        
        // Send separate message about new highest bid
        if (highestBid && bids.length > 1) {
          const bidNotificationEmbed = new EmbedBuilder()
            .setColor(0x7b9e1e)
            .setDescription(`🎯 **Новая максимальная ставка!**\n\n💰 **${highestBid.amount}** <:steamworkshop_collection_8776158:1423962802640650351> от <@${highestBid.bidder.discordId}>\n\n📊 **Всего ставок:** ${bids.length}`)
            .setTimestamp();
          
          await thread.send({
            embeds: [bidNotificationEmbed]
          });
          console.log(`[AUCTION SERVICE] Sent bid notification for auction ${auctionId}`);
        }
      } else {
        console.log(`[AUCTION SERVICE] No first message found in thread ${auction.threadId}`);
      }

    } catch (error) {
      console.error(`[AUCTION SERVICE] Error updating auction forum embed:`, error);
      logger.error('Error updating auction forum embed:', error);
    }
  }
}
