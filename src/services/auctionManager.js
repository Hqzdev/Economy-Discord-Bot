import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';

export class AuctionManager {
  constructor(client) {
    this.client = client;
    this.checkInterval = 30000; // Проверяем каждые 30 секунд
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('AuctionManager started');
    
    // Проверяем сразу при запуске
    this.checkAuctions();
    
    // Затем проверяем каждые 30 секунд
    this.interval = setInterval(() => {
      this.checkAuctions();
    }, this.checkInterval);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info('AuctionManager stopped');
  }

  async checkAuctions() {
    try {
      const now = new Date();
      const activeAuctions = Array.from(db.data.auctions.values())
        .filter(auction => 
          auction.status === 'ACTIVE' && 
          new Date(auction.endTime) <= now
        );

      for (const auction of activeAuctions) {
        await this.endAuction(auction);
      }
    } catch (error) {
      logger.error('Error checking auctions:', error);
    }
  }

  async endAuction(auction) {
    try {
      // Получаем полную информацию об аукционе с создателем
      const fullAuction = db.data.auctions.get(auction.id);
      if (!fullAuction) {
        logger.error(`Auction ${auction.id} not found in database`);
        return;
      }

      // Получаем создателя аукциона
      const creator = db.data.users.get(fullAuction.creatorId);
      if (!creator) {
        logger.error(`Creator ${fullAuction.creatorId} not found for auction ${auction.id}`);
        return;
      }

      // Получаем все ставки для этого аукциона
      const bids = db.getAuctionBids(auction.id);
      
      if (bids.length === 0) {
        // Нет ставок - аукцион завершается без победителя
        db.updateAuctionStatus(auction.id, 'ENDED_NO_BIDS');
        logger.info(`Auction ${auction.id} ended with no bids`);
        
        await this.notifyAuctionEnd(fullAuction, creator, null, bids);
        return;
      }

      // Находим победителя (самая высокая ставка)
      const winner = bids[0]; // bids уже отсортированы по убыванию
      
      // Обновляем статус аукциона
      db.updateAuctionStatus(auction.id, 'ENDED');
      db.setAuctionWinner(auction.id, winner.bidderId, winner.amount);
      
      logger.info(`Auction ${auction.id} ended. Winner: ${winner.bidder.discordId} with ${winner.amount} coins`);
      
      await this.notifyAuctionEnd(fullAuction, creator, winner, bids);
      
    } catch (error) {
      logger.error(`Error ending auction ${auction.id}:`, error);
    }
  }

  async notifyAuctionEnd(auction, creator, winner, allBids) {
    try {
      // Ищем канал для уведомлений (можно настроить в конфиге)
      const channelId = process.env.AUCTION_CHANNEL_ID || process.env.GENERAL_CHANNEL_ID;
      if (!channelId) {
        logger.warn('No auction notification channel configured');
        return;
      }

      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        logger.warn(`Auction notification channel ${channelId} not found`);
        return;
      }

      const { EmbedBuilder } = await import('discord.js');
      
      const embed = new EmbedBuilder()
        .setTitle('🏁 Аукцион завершён')
        .setColor(winner ? 0x00ff00 : 0xff0000)
        .addFields(
          {
            name: 'Товар',
            value: auction.itemName,
            inline: true,
          },
          {
            name: 'ID аукциона',
            value: `\`${auction.id}\``,
            inline: true,
          },
          {
            name: 'Создатель',
            value: `<@${creator.discordId}>`,
            inline: true,
          }
        );

      if (winner) {
        embed.addFields(
          {
            name: '🏆 Победитель',
            value: `<@${winner.bidder.discordId}>`,
            inline: true,
          },
          {
            name: '💰 Выигрышная ставка',
            value: `${winner.amount} монет`,
            inline: true,
          },
          {
            name: '📊 Всего ставок',
            value: `${allBids.length}`,
            inline: true,
          }
        );

        // Показываем топ-3 ставки
        if (allBids.length > 1) {
          const topBids = allBids.slice(0, 3).map((bid, index) => 
            `${index + 1}. <@${bid.bidder.discordId}> - ${bid.amount} монет`
          ).join('\n');
          
          embed.addFields({
            name: '🏅 Топ ставки',
            value: topBids,
            inline: false,
          });
        }
      } else {
        embed.addFields({
          name: '❌ Результат',
          value: 'Аукцион завершён без ставок',
          inline: false,
        });
      }

      embed.setTimestamp();

      await channel.send({
        content: winner ? `<@${winner.bidder.discordId}>` : undefined,
        embeds: [embed],
      });

    } catch (error) {
      logger.error('Error sending auction end notification:', error);
    }
  }
}
