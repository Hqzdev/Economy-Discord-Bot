import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { AuctionService } from '../services/simpleAuctionService.js';

const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Показать главное меню рынка');

async function execute(interaction) {
  try {
    const listingService = new ListingService();
    const auctionService = new AuctionService();

    // Get market stats
    const [listingStats, auctionStats] = await Promise.all([
      listingService.getListingStats(),
      auctionService.getAuctionStats(),
    ]);

    const embed = new EmbedBuilder()
      .setTitle('🏪 Рынок товаров')
      .setDescription('Торговая площадка для обмена товарами между игроками')
      .setColor(EMBED_COLORS.PRIMARY)
      .addFields(
        {
          name: '📊 Статистика рынка',
          value: `Активных лотов: ${listingStats.active}\nЗапланированных аукционов: ${auctionStats.scheduled}`,
          inline: true,
        },
        {
          name: 'ℹ️ Информация',
          value: 'Discord бот - посредник для торговли\nРеальные транзакции происходят в игре',
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: `Пользователь: ${interaction.user.username}` });

    const row = {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: TEXTS.MAIN_MENU.BUY_BUTTON,
          custom_id: UI_CONSTANTS.BUTTON_IDS.BUY,
        },
        {
          type: 2,
          style: 3,
          label: TEXTS.MAIN_MENU.SELL_BUTTON,
          custom_id: UI_CONSTANTS.BUTTON_IDS.SELL,
        },
        {
          type: 2,
          style: 1,
          label: TEXTS.MAIN_MENU.AUCTION_BUTTON,
          custom_id: UI_CONSTANTS.BUTTON_IDS.AUCTION,
        },
        {
          type: 2,
          style: 4,
          label: TEXTS.MAIN_MENU.DEALS_BUTTON,
          custom_id: UI_CONSTANTS.BUTTON_IDS.DEALS,
        },
      ],
    };

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false,
    });
  } catch (error) {
    console.error('Error in market command:', error);
    await interaction.reply({
      content: TEXTS.ERRORS.INTERNAL_ERROR,
      ephemeral: true,
    });
  }
}

export default { data, execute };
