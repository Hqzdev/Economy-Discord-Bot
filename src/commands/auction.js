import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType } from 'discord.js';
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
      .addStringOption(option =>
        option
          .setName('category')
          .setDescription('Категория товара')
          .setRequired(true)
          .addChoices(
            { name: 'Оружие', value: 'Оружие' },
            { name: 'Снаряжение', value: 'Снаряжение' },
            { name: 'Зелья', value: 'Зелья' },
            { name: 'Еда', value: 'Еда' },
            { name: 'Ингредиенты', value: 'Ингредиенты' },
            { name: 'Рыба', value: 'Рыба' },
            { name: 'Мясо', value: 'Мясо' },
            { name: 'Слитки', value: 'Слитки' },
            { name: 'Книги', value: 'Книги' },
            { name: 'Драгоценности', value: 'Драгоценности' },
            { name: 'Ювелирные изделия', value: 'Ювелирные изделия' },
            { name: 'Шкуры', value: 'Шкуры' },
            { name: 'Магическое', value: 'Магическое' },
            { name: 'Сосуды', value: 'Сосуды' },
            { name: 'Алкоголь', value: 'Алкоголь' },
            { name: 'Руда', value: 'Руда' }
          )
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
          .setDescription('Минимальная стоимость')
          .setRequired(true)
          .setMinValue(1)
      )
      .addStringOption(option =>
        option
          .setName('image_url')
          .setDescription('Ссылка на изображение товара (не обязательно)')
          .setRequired(false)
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
          .setDescription('Сумма ставки')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('info')
      .setDescription('<:2_:1423965583963328633> Информация об аукционе')
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
    auctionService.setClient(interaction.client);
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
      const category = interaction.options.getString('category');
      const imageUrl = interaction.options.getString('image_url');
      const duration = interaction.options.getInteger('duration');
      const minPrice = interaction.options.getInteger('min_price');
      const description = interaction.options.getString('description');

      // Calculate start time (now) and end time
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000); // duration in minutes

      // Create auction
      const user = await userService.getOrCreateUser(interaction.user.id);
      const auction = await auctionService.createAuction(user.id, itemName, startTime, endTime, minPrice, description, category, imageUrl);

      // Create forum discussion will be done after reply

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
        .setColor(0x7b9e1e)
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АУКЦИОН СОЗДАН ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
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
            name: '<:4_:1423965817523142666> Длительность',
            value: `${duration} минут`,
            inline: true,
          },
          {
            name: 'Мин. стоимость',
            value: `${minPrice} <:steamworkshop_collection_8776158:1423962802640650351>`,
            inline: true,
          },
          {
            name: '<:4_:1423965817523142666> Завершится',
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
        ephemeral: true,
      });

      // Create forum discussion after replying (async, no await to prevent blocking)
      createAuctionForumThread(interaction.client, auction).catch(error => {
        console.error('Error creating forum thread:', error);
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
        .setColor(0x7b9e1e)
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АКТИВНЫЕ АУКЦИОНЫ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
        .setTimestamp();

      for (const auction of auctions.slice(0, 10)) { // Limit to 10 auctions
        const timeLeft = Math.max(0, Math.floor((auction.endTime.getTime() - Date.now()) / 1000));
        
        // Get current highest bid
        const bids = await auctionService.getAuctionBids(auction.id);
        const highestBid = bids.length > 0 ? bids[0] : null;
        
        let bidInfo = '**Ставок:** 0';
        if (highestBid) {
          bidInfo = `**Текущая ставка:** ${highestBid.amount} <:steamworkshop_collection_8776158:1423962802640650351> от <@${highestBid.bidder.discordId}> (${highestBid.bidder.username || 'Неизвестно'})\n**Всего ставок:** ${bids.length}`;
        }
        
        embed.addFields({
          name: `${auction.itemName} (ID: ${auction.id})`,
          value: `**<:4_:1423965817523142666> Осталось:** <t:${Math.floor(auction.endTime.getTime() / 1000)}:R>\n**Мин. стоимость:** ${auction.minPrice} <:steamworkshop_collection_8776158:1423962802640650351>\n${bidInfo}\n**<:6_:1423966899443601449> Создатель:** <@${auction.creator.discordId}> (${auction.creator.username || 'Неизвестно'})${auction.description ? `\n**Описание:** ${auction.description}` : ''}`,
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

      console.log(`[AUCTION BID] User ${interaction.user.id} (${interaction.user.username}) trying to bid ${amount} on auction ${auctionId}`);

      // Make bid
      const user = await userService.getOrCreateUser(interaction.user.id);
      console.log(`[AUCTION BID] User object:`, { id: user.id, discordId: user.discordId, username: user.username });
      
      const bid = await auctionService.makeBid(auctionId, user.id, amount);
      console.log(`[AUCTION BID] Bid created successfully:`, { bidId: bid.id, amount: bid.amount, auctionId });

      // Log action
      await auditService.logAction(interaction.user.id, 'AUCTION_BID', {
        auctionId,
        amount,
        bidId: bid.id,
      });

      const embed = new EmbedBuilder()
        .setColor(0x7b9e1e)
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СТАВКА СДЕЛАНА ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

Ставка ${amount} <:steamworkshop_collection_8776158:1423962802640650351> сделана в аукционе #${auctionId}`)
        .addFields(
          {
            name: 'Сумма ставки',
            value: `${amount} <:steamworkshop_collection_8776158:1423962802640650351>`,
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
        .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ АУКЦИОН: ${auction.itemName} ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
        .setColor(auction.status === 'ACTIVE' ? EMBED_COLORS.SUCCESS : EMBED_COLORS.INFO)
        .addFields(
          {
            name: '**ID аукциона**',
            value: `> \`${auction.id}\``,
            inline: true,
          },
          {
            name: '**Статус**',
            value: `<:1_:1423962783535337552> ${auction.status === 'ACTIVE' ? '🟢 Активен' : 
                   auction.status === 'ENDED' ? '🏁 Завершён' : 
                   auction.status === 'ENDED_NO_BIDS' ? '❌ Завершён без ставок' : '⏸️ Неизвестно'}`,
            inline: true,
          },
          {
            name: '**Создатель**',
            value: `<:1_:1423962783535337552> <@${auction.creator.discordId}> (${auction.creator.username || 'Неизвестно'})`,
            inline: true,
          },
          {
            name: '**Мин. стоимость**',
            value: `> ${auction.minPrice} <:steamworkshop_collection_8776158:1423962802640650351>`,
            inline: true,
          },
          {
            name: '**Завершится**',
            value: `<:1_:1423962783535337552> <t:${Math.floor(new Date(auction.endTime).getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: '**Ставок**',
            value: `> ${bids.length}`,
            inline: true,
          }
        );

      // Add current highest bid info
      if (bids.length > 0) {
        const highestBid = bids[0];
        embed.addFields({
          name: '**💰 Текущая ставка**',
          value: `> ${highestBid.amount} <:steamworkshop_collection_8776158:1423962802640650351> от <:1_:1423962783535337552> <@${highestBid.bidder.discordId}> (${highestBid.bidder.username || 'Неизвестно'})`,
          inline: false,
        });
      }

      if (auction.winnerId) {
        const winner = await userService.getUserById(auction.winnerId);
        embed.addFields({
          name: '**🏆 Победитель**',
          value: `<:1_:1423962783535337552> <@${winner.discordId}> (${winner.username || 'Неизвестно'}) - > ${auction.winningAmount} <:steamworkshop_collection_8776158:1423962802640650351>`,
          inline: false,
        });
      }

      if (bids.length > 0) {
        const topBids = bids.slice(0, 5).map((bid, index) => 
          `${index + 1}. <:1_:1423962783535337552> <@${bid.bidder.discordId}> (${bid.bidder.username || 'Неизвестно'}) - > ${bid.amount} <:steamworkshop_collection_8776158:1423962802640650351>`
        ).join('\n');
        
        embed.addFields({
          name: '**🏅 Топ ставки**',
          value: topBids,
          inline: false,
        });
      }

      if (auction.description) {
        embed.addFields({
          name: '**Описание**',
          value: `<:1_:1423962783535337552> ${auction.description}`,
          inline: false,
        });
      }

      embed.setTimestamp();

      // Create buttons for active auctions
      let components = [];
      if (auction.status === 'ACTIVE') {
        const bidButton = new ButtonBuilder()
          .setCustomId(`auction_bid_${auction.id}`)
          .setLabel('Поднять ставку')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('<:3465:1423975798049738832>');

        const withdrawButton = new ButtonBuilder()
          .setCustomId(`auction_withdraw_${auction.id}`)
          .setLabel('Отказаться')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌');

        components = [new ActionRowBuilder().addComponents(bidButton, withdrawButton)];
      }

      await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('[AUCTION COMMAND ERROR]', error);
    console.error('[AUCTION COMMAND ERROR] Stack:', error.stack);
    console.error('[AUCTION COMMAND ERROR] Subcommand:', interaction.options.getSubcommand());
    console.error('[AUCTION COMMAND ERROR] User:', { id: interaction.user.id, username: interaction.user.username });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: TEXTS.ERRORS.INTERNAL_ERROR,
        ephemeral: true,
      });
    }
  }
}

// Track created threads to prevent duplicates
const createdThreads = new Set();

async function createAuctionForumThread(client, auction) {
  try {
    // Check if thread already created for this auction
    if (createdThreads.has(auction.id)) {
      console.log(`Thread already created for auction ${auction.id}`);
      return;
    }

    // Get forum channel
    const forumChannel = client.channels.cache.get(process.env.AUCTION_CHANNEL_ID);
    if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
      console.error('Forum channel not found or not a forum');
      return;
    }

    // Create embed for auction
    const embed = new EmbedBuilder()
      .setTitle(`🔨 Аукцион: ${auction.itemName}`)
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
          value: `> <@${auction.creator.discordId}>`,
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
          name: '**Текущая ставка**',
          value: '> Нет ставок',
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

    // Create buttons
    const bidButton = new ButtonBuilder()
      .setCustomId(`auction_bid_${auction.id}`)
      .setLabel('Поставить ставку')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('<:3465:1423975798049738832>');

    const components = [new ActionRowBuilder().addComponents(bidButton)];

    // Create forum thread
    const thread = await forumChannel.threads.create({
      name: `${auction.itemName} - ${auction.minPrice} <:steamworkshop_collection_8776158:1423962802640650351>`,
      message: {
        embeds: [embed],
        components,
      },
    });

    // Store thread ID in auction
    auction.threadId = thread.id;
    
    // Update auction in database with thread ID
    const db = (await import('../database/jsonDb.js')).default;
    const auctionData = db.data.auctions.get(auction.id);
    if (auctionData) {
      auctionData.threadId = thread.id;
      db.save();
    }
    
    // Mark thread as created
    createdThreads.add(auction.id);
    console.log(`Created forum thread ${thread.id} for auction ${auction.id}`);

  } catch (error) {
    console.error('Error creating auction forum thread:', error);
  }
}

export default { data, execute };
