import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { ListingService } from '../services/simpleListingService.js';
import { AuctionService } from '../services/simpleAuctionService.js';
import { createMainMenuButtons } from '../ui/components.js';

const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Показать главное меню рынка (только для администраторов)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  try {
    const listingService = new ListingService();
    const auctionService = new AuctionService();

    // Get market stats
    const [listingStats, auctionStats] = await Promise.all([
      listingService.getListingStats(),
      auctionService.getAuctionStats(),
    ]);


    const imageUrl = 'https://cdn.discordapp.com/attachments/1423960996547924009/1424077421715652668/126-1921x1080-desktop-hd-skyrim-wallpaper-image.jpg?ex=68e2a2f3&is=68e15173&hm=995e0f273f4985292377b6c7f42388f0ba0afd2fd8ffb30abb71bb9761d1f165&';

    // Первый эмбед - только картинка
    const imageEmbed = new EmbedBuilder()
      .setImage(imageUrl)
      .setColor(0x7b9e1e);

    // Второй эмбед - основной текст
    const mainEmbed = new EmbedBuilder()
      .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ Рынок Маркарта ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ \`\`\`

Торговая площадка для обмена товарами между игроками`)
      .setColor(0x7b9e1e)
      .addFields(
        {
          name: '**Статистика**',
          value: `**Активных лотов**
> ${listingStats.active}

**Активных аукционов**
> ${auctionStats.scheduled}

**Всего сделок**
> ${listingStats.total || 0}`,
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
      );

    const components = createMainMenuButtons();

    // Add statistics button to second row
    components[1].addComponents(
      new ButtonBuilder()
        .setCustomId('market_stats')
        .setLabel('Статистика')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423973804467814400')
    );

    // Отправляем два эмбеда: первый с картинкой, второй с текстом
    await interaction.reply({
      embeds: [imageEmbed, mainEmbed],
      components: components,
      ephemeral: false,
    });
  } catch (error) {
    console.error('Error in market command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: TEXTS.ERRORS.INTERNAL_ERROR,
        ephemeral: true,
      });
    }
  }
}

export default { data, execute };
