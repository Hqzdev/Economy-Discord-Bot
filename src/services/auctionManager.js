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

      // Получаем создателя аукциона - сначала по Discord ID, потом по внутреннему ID
      let creator = db.getUserByDiscordId(fullAuction.creatorId);
      if (!creator) {
        // Fallback: попробуем найти по внутреннему ID
        creator = db.data.users.get(fullAuction.creatorId);
      }
      if (!creator) {
        logger.error(`Creator ${fullAuction.creatorId} not found for auction ${auction.id}`);
        return;
      }

      // Получаем все ставки для этого аукциона
      const bids = db.getAuctionBids(auction.id);
      
      if (bids.length === 0) {
        // Нет ставок - аукцион завершается без победителя
        db.updateAuctionStatus(auction.id, 'ENDED_NO_BIDS');
        logger.info(`🏁 АУКЦИОН ЗАВЕРШЁН БЕЗ СТАВОК: ${auction.itemName} (ID: ${auction.id})`);
        logger.info(`❌ ПОБЕДИТЕЛЬ: Нет победителя`);
        logger.info(`📊 ВСЕГО СТАВОК: 0`);
        logger.info(`⏰ ВРЕМЯ ЗАВЕРШЕНИЯ: ${new Date().toISOString()}`);
        
        // Логируем аукцион без ставок
        await this.logAuctionResult(fullAuction, creator, null, bids);
        
        await this.notifyAuctionEnd(fullAuction, creator, null, bids);
        return;
      }

      // Находим победителя (самая высокая ставка)
      const winner = bids[0]; // bids уже отсортированы по убыванию
      
      // Обновляем статус аукциона
      db.updateAuctionStatus(auction.id, 'ENDED');
      db.setAuctionWinner(auction.id, winner.bidderId, winner.amount);
      
      logger.info(`🏆 АУКЦИОН ЗАВЕРШЁН: ${auction.itemName} (ID: ${auction.id})`);
      logger.info(`👑 ПОБЕДИТЕЛЬ: <@${winner.bidder.discordId}> (${winner.bidder.username || 'Неизвестно'})`);
      logger.info(`💰 ВЫИГРЫШНАЯ СТАВКА: ${winner.amount} монет`);
      logger.info(`📊 ВСЕГО СТАВОК: ${bids.length}`);
      logger.info(`⏰ ВРЕМЯ ЗАВЕРШЕНИЯ: ${new Date().toISOString()}`);
      
      // Логируем детали аукциона для админов
      await this.logAuctionResult(fullAuction, creator, winner, bids);
      
      await this.notifyAuctionEnd(fullAuction, creator, winner, bids);
      
    } catch (error) {
      logger.error(`Error ending auction ${auction.id}:`, error);
    }
  }

  async notifyAuctionEnd(auction, creator, winner, allBids) {
    try {
      // Отправляем уведомление в текстовый канал для уведомлений
      const channelId = process.env.AUCTION_NOTIFICATION_CHANNEL_ID || process.env.GENERAL_CHANNEL_ID;
      if (!channelId) {
        logger.warn('No auction notification channel configured (AUCTION_NOTIFICATION_CHANNEL_ID)');
        return;
      }
      
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        logger.warn(`Auction notification channel ${channelId} not found`);
        return;
      }
      
      if (!channel.send) {
        logger.warn(`Auction notification channel ${channel.id} is not a text channel (type: ${channel.type})`);
        return;
      }

      const { EmbedBuilder } = await import('discord.js');
      
      const embed = new EmbedBuilder()
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АУКЦИОН ЗАВЕРШЁН ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
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
            value: `<@${creator.discordId}> (${creator.username || 'Неизвестно'})`,
            inline: true,
          }
        );

      if (winner) {
        embed.addFields(
          {
            name: '🏆 Победитель',
            value: `<@${winner.bidder.discordId}> (${winner.bidder.username || 'Неизвестно'})`,
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
            `${index + 1}. <@${bid.bidder.discordId}> (${bid.bidder.username || 'Неизвестно'}) - ${bid.amount} монет`
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

      // Update forum thread with winner information
      if (auction.threadId) {
        try {
          const thread = await this.client.channels.fetch(auction.threadId);
          if (thread) {
            // Update thread name to show it's closed
            const newName = `[ЗАКРЫТ] ${auction.itemName} - ${winner ? `${winner.amount} <:steamworkshop_collection_8776158:1423962802640650351>` : 'Без ставок'}`;
            await thread.setName(newName);
            
            // Send winner announcement in forum
            const { EmbedBuilder } = await import('discord.js');
            const winnerEmbed = new EmbedBuilder()
              .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АУКЦИОН ЗАВЕРШЁН ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
              .setColor(winner ? 0x00ff00 : 0xff0000)
              .addFields(
                {
                  name: '🏆 Результат',
                  value: winner ? 
                    `**Победитель:** <@${winner.bidder.discordId}> (${winner.bidder.username || 'Неизвестно'})\n**Выигрышная ставка:** ${winner.amount} <:steamworkshop_collection_8776158:1423962802640650351>\n**Всего ставок:** ${allBids.length}` :
                    '❌ Аукцион завершён без ставок',
                  inline: false,
                }
              )
              .setTimestamp();

            if (winner && allBids.length > 1) {
              const topBids = allBids.slice(0, 3).map((bid, index) => 
                `${index + 1}. <@${bid.bidder.discordId}> (${bid.bidder.username || 'Неизвестно'}) - ${bid.amount} <:steamworkshop_collection_8776158:1423962802640650351>`
              ).join('\n');
              
              winnerEmbed.addFields({
                name: '🏅 Топ ставки',
                value: topBids,
                inline: false,
              });
            }

            await thread.send({
              content: winner ? `<@${winner.bidder.discordId}>` : undefined,
              embeds: [winnerEmbed],
            });
            
            logger.info(`Updated auction forum thread: ${auction.threadId} for auction ${auction.id}`);
          }
        } catch (error) {
          logger.error(`Error updating auction forum thread ${auction.threadId}:`, error);
        }
      }

      // Send detailed notification to admin log channel
      const adminChannelId = process.env.ADMIN_LOG_CHANNEL_ID;
      if (adminChannelId) {
        const adminChannel = await this.client.channels.fetch(adminChannelId);
        if (adminChannel && adminChannel.send) {
          const adminEmbed = new EmbedBuilder()
            .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АУКЦИОН ЗАВЕРШЁН - АДМИН ЛОГ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
            .setColor(0x7b9e1e)
            .addFields(
              {
                name: 'ID аукциона',
                value: `\`${auction.id}\``,
                inline: true,
              },
              {
                name: 'Товар',
                value: auction.itemName,
                inline: true,
              },
              {
                name: 'Категория',
                value: auction.category || 'Не указана',
                inline: true,
              },
              {
                name: 'Создатель',
                value: `<@${creator.discordId}> (${creator.username || 'Неизвестно'})`,
                inline: true,
              },
              {
                name: 'Мин. цена',
                value: `${auction.minPrice} `,
                inline: true,
              },
              {
                name: 'Всего ставок',
                value: `${allBids.length}`,
                inline: true,
              }
            );

          if (winner) {
            adminEmbed.addFields(
              {
                name: '🏆 Победитель',
                value: `<@${winner.bidder.discordId}> (${winner.bidder.username || 'Неизвестно'})`,
                inline: true,
              },
              {
                name: '💰 Выигрышная ставка',
                value: `${winner.amount} `,
                inline: true,
              },
              {
                name: '📊 Топ ставки',
                value: allBids.slice(0, 5).map((bid, index) => 
                  `${index + 1}. <@${bid.bidder.discordId}> (${bid.bidder.username || 'Неизвестно'}) - ${bid.amount} `
                ).join('\n') || 'Нет ставок',
                inline: false,
              }
            );
          } else {
            adminEmbed.addFields({
              name: 'Результат',
              value: '❌ Аукцион завершён без ставок',
              inline: false,
            });
          }

          adminEmbed.setTimestamp();

          await adminChannel.send({
            embeds: [adminEmbed],
          });
        }
      }

    } catch (error) {
      logger.error('Error sending auction end notification:', error);
    }
  }

  async logAuctionResult(auction, creator, winner, allBids) {
    try {
      const logData = {
        auctionId: auction.id,
        itemName: auction.itemName,
        description: auction.description || 'Нет описания',
        category: auction.category || 'Не указана',
        minPrice: auction.minPrice,
        creator: {
          discordId: creator.discordId,
          username: creator.username || 'Неизвестно'
        },
        endTime: auction.endTime,
        totalBids: allBids.length,
        bids: allBids.map(bid => ({
          bidderId: bid.bidder.discordId,
          bidderUsername: bid.bidder.username || 'Неизвестно',
          amount: bid.amount,
          timestamp: bid.timestamp
        })),
        result: winner ? {
          winnerId: winner.bidder.discordId,
          winnerUsername: winner.bidder.username || 'Неизвестно',
          winningAmount: winner.amount,
          status: 'COMPLETED'
        } : {
          status: 'NO_BIDS'
        },
        timestamp: new Date().toISOString()
      };

      // Логируем в файл
      logger.info('AUCTION_RESULT', logData);

      // Сохраняем в базу данных для админов
      if (!db.data.auctionLogs) {
        db.data.auctionLogs = new Map();
      }
      
      db.data.auctionLogs.set(auction.id, logData);
      db.save();

    } catch (error) {
      logger.error('Error logging auction result:', error);
    }
  }
}
