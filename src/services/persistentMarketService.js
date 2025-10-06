import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { UI_CONSTANTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from './simpleListingService.js';
import { AuctionService } from './simpleAuctionService.js';
import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';

export class PersistentMarketService {
  constructor(client) {
    this.client = client;
    this.listingService = new ListingService();
    this.auctionService = new AuctionService();
    this.updateQueue = new Set(); // Очередь обновлений для предотвращения спама
  }

  async updatePersistentMarket(force = false) {
    try {
      const persistentMessage = db.getPersistentMessage('market');
      
      if (!persistentMessage) {
        return; // No persistent message set up
      }

      // Проверяем, не обновляется ли уже рынок
      if (!force && this.updateQueue.has('market')) {
        return; // Обновление уже в процессе
      }

      this.updateQueue.add('market');

      const channel = await this.client.channels.fetch(persistentMessage.channelId);
      if (!channel) {
        logger.warn(`Persistent market channel ${persistentMessage.channelId} not found`);
        return;
      }

      const message = await channel.messages.fetch(persistentMessage.messageId);
      if (!message) {
        logger.warn(`Persistent market message ${persistentMessage.messageId} not found`);
        return;
      }

      // Get updated market stats
      const [listingStats, auctionStats] = await Promise.all([
        this.listingService.getListingStats(),
        this.auctionService.getAuctionStats(),
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

      await message.edit({
        embeds: [imageEmbed, embed],
        components: [row1, row2],
      });

      logger.info('Persistent market message updated successfully');

    } catch (error) {
      logger.error('Error updating persistent market:', error);
    } finally {
      // Убираем из очереди обновлений
      this.updateQueue.delete('market');
    }
  }

  // Мгновенное обновление рынка
  async instantUpdate() {
    await this.updatePersistentMarket(true);
  }

  // Обновление с задержкой (для предотвращения спама)
  async delayedUpdate(delay = 2000) {
    setTimeout(async () => {
      await this.updatePersistentMarket();
    }, delay);
  }

  async setupAutoUpdate() {
    // Update every 5 minutes
    setInterval(() => {
      this.updatePersistentMarket();
    }, 5 * 60 * 1000);

    logger.info('Persistent market auto-update started (every 5 minutes)');
  }
}
