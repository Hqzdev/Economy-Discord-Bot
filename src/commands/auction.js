import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { TEXTS, EMBED_COLORS } from '../utils/constants.js';
import { AuctionService } from '../services/simpleAuctionService.js';
import { UserService } from '../services/simpleUserService.js';
import { AuditService } from '../services/simpleAuditService.js';
import { config } from '../config/index.js';

const data = new SlashCommandBuilder()
  .setName('auction')
  .setDescription('Управление аукционами')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Создать новый аукцион (только для аукционеров)')
      .addStringOption(option =>
        option
          .setName('name')
          .setDescription('Название товара')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('duration')
          .setDescription('Длительность аукциона в минутах')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(1440) // Максимум 24 часа
      )
      .addIntegerOption(option =>
        option
          .setName('min_price')
          .setDescription('Минимальная стоимость (в монетах)')
          .setRequired(true)
          .setMinValue(1)
      )
      .addStringOption(option =>
        option
          .setName('description')
          .setDescription('Описание аукциона')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('Показать активные аукционы')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('bid')
      .setDescription('Сделать ставку в аукционе')
      .addStringOption(option =>
        option
          .setName('auction_id')
          .setDescription('ID аукциона')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Сумма ставки (в монетах)')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('info')
      .setDescription('Информация об аукционе')
      .addStringOption(option =>
        option
          .setName('auction_id')
          .setDescription('ID аукциона')
          .setRequired(true)
      )
  );

async function execute(interaction) {
  try {
    const auctionService = new AuctionService();
    const userService = new UserService();
    const auditService = new AuditService();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      // Check if user has auctioneer role
      const member = interaction.member;
      if (!member.roles.cache.has(config.discord.auctioneerRoleId)) {
        return await interaction.reply({
          content: TEXTS.ERRORS.AUCTIONEER_ONLY,
          ephemeral: true,
        });
      }

      const itemName = interaction.options.getString('name');
      const duration = interaction.options.getInteger('duration');
      const minPrice = interaction.options.getInteger('min_price');
      const description = interaction.options.getString('description');

      // Calculate start time (now) and end time
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000); // duration in minutes

      // Create auction
      const user = await userService.getOrCreateUser(interaction.user.id);
      const auction = await auctionService.createAuction(user.id, itemName, startTime, endTime, minPrice, description);

      // Log action
      await auditService.logAction(interaction.user.id, 'AUCTION_CREATED', {
        auctionId: auction.id,
        itemName,
        duration: duration,
        minPrice: minPrice,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      const embed = new EmbedBuilder()
        .setTitle('🔨 Аукцион создан')
        .setColor(EMBED_COLORS.SUCCESS)
        .addFields(
          {
            name: 'ID аукциона',
            value: `\`${auction.id}\``,
            inline: false,
          },
          {
            name: 'Товар',
            value: itemName,
            inline: true,
          },
          {
            name: 'Длительность',
            value: `${duration} минут`,
            inline: true,
          },
          {
            name: 'Мин. стоимость',
            value: `${minPrice} монет`,
            inline: true,
          },
          {
            name: 'Завершится',
            value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: 'Статус',
            value: TEXTS.AUCTION.SCHEDULED,
            inline: true,
          }
        );

      if (description) {
        embed.addFields({
          name: 'Описание',
          value: description,
          inline: false,
        });
      }

      embed.setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
      });

    } else if (subcommand === 'list') {
      const auctions = await auctionService.getActiveAuctions();

      if (auctions.length === 0) {
        return await interaction.reply({
          content: TEXTS.AUCTION.NO_AUCTIONS,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔨 Активные аукционы')
        .setColor(EMBED_COLORS.INFO)
        .setTimestamp();

      for (const auction of auctions.slice(0, 10)) { // Limit to 10 auctions
        const timeLeft = Math.max(0, Math.floor((auction.endTime.getTime() - Date.now()) / 1000));
        
        // Get current highest bid
        const bids = await auctionService.getAuctionBids(auction.id);
        const highestBid = bids.length > 0 ? bids[0] : null;
        
        let bidInfo = '**Ставок:** 0';
        if (highestBid) {
          bidInfo = `**Текущая ставка:** ${highestBid.amount} монет от <@${highestBid.bidder.discordId}>\n**Всего ставок:** ${bids.length}`;
        }
        
        embed.addFields({
          name: `${auction.itemName} (ID: ${auction.id})`,
          value: `**Осталось:** <t:${Math.floor(auction.endTime.getTime() / 1000)}:R>\n**Мин. стоимость:** ${auction.minPrice} монет\n${bidInfo}\n**Создатель:** <@${auction.creator.discordId}>${auction.description ? `\n**Описание:** ${auction.description}` : ''}`,
          inline: false,
        });
      }

      if (auctions.length > 10) {
        embed.setFooter({ text: `Показано 10 из ${auctions.length} аукционов` });
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

    } else if (subcommand === 'bid') {
      const auctionId = interaction.options.getString('auction_id');
      const amount = interaction.options.getInteger('amount');

      // Make bid
      const user = await userService.getOrCreateUser(interaction.user.id);
      const bid = await auctionService.makeBid(auctionId, user.id, amount);

      // Log action
      await auditService.logAction(interaction.user.id, 'AUCTION_BID', {
        auctionId,
        amount,
        bidId: bid.id,
      });

      const embed = new EmbedBuilder()
        .setTitle('💰 Ставка сделана')
        .setColor(EMBED_COLORS.SUCCESS)
        .setDescription(`Ставка ${amount} монет сделана в аукционе #${auctionId}`)
        .addFields(
          {
            name: 'Сумма ставки',
            value: `${amount} монет`,
            inline: true,
          },
          {
            name: 'ID ставки',
            value: bid.id,
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

    } else if (subcommand === 'info') {
      const auctionId = interaction.options.getString('auction_id');
      
      // Get auction info
      const auction = await auctionService.getAuctionInfo(auctionId);
      const bids = await auctionService.getAuctionBids(auctionId);

      if (!auction) {
        return await interaction.reply({
          content: '❌ Аукцион не найден',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔨 Аукцион: ${auction.itemName}`)
        .setColor(auction.status === 'ACTIVE' ? EMBED_COLORS.SUCCESS : EMBED_COLORS.INFO)
        .addFields(
          {
            name: 'ID аукциона',
            value: `\`${auction.id}\``,
            inline: true,
          },
          {
            name: 'Статус',
            value: auction.status === 'ACTIVE' ? '🟢 Активен' : 
                   auction.status === 'ENDED' ? '🏁 Завершён' : 
                   auction.status === 'ENDED_NO_BIDS' ? '❌ Завершён без ставок' : '⏸️ Неизвестно',
            inline: true,
          },
          {
            name: 'Создатель',
            value: `<@${auction.creator.discordId}>`,
            inline: true,
          },
          {
            name: 'Мин. стоимость',
            value: `${auction.minPrice} монет`,
            inline: true,
          },
          {
            name: 'Завершится',
            value: `<t:${Math.floor(new Date(auction.endTime).getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: 'Ставок',
            value: `${bids.length}`,
            inline: true,
          }
        );

      // Add current highest bid info
      if (bids.length > 0) {
        const highestBid = bids[0];
        embed.addFields({
          name: '💰 Текущая ставка',
          value: `${highestBid.amount} монет от <@${highestBid.bidder.discordId}>`,
          inline: false,
        });
      }

      if (auction.winnerId) {
        const winner = await userService.getUserById(auction.winnerId);
        embed.addFields({
          name: '🏆 Победитель',
          value: `<@${winner.discordId}> - ${auction.winningAmount} монет`,
          inline: false,
        });
      }

      if (bids.length > 0) {
        const topBids = bids.slice(0, 5).map((bid, index) => 
          `${index + 1}. <@${bid.bidder.discordId}> - ${bid.amount} монет`
        ).join('\n');
        
        embed.addFields({
          name: '🏅 Топ ставки',
          value: topBids,
          inline: false,
        });
      }

      if (auction.description) {
        embed.addFields({
          name: 'Описание',
          value: auction.description,
          inline: false,
        });
      }

      embed.setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('Error in auction command:', error);
    await interaction.reply({
      content: TEXTS.ERRORS.INTERNAL_ERROR,
      ephemeral: true,
    });
  }
}

export default { data, execute };
