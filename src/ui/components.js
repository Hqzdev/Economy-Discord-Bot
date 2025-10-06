import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} from 'discord.js';
import { UI_CONSTANTS, TEXTS, EMBED_COLORS } from '../utils/constants.js';

// Main menu buttons
export function createMainMenuButtons() {
  const row1 = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.SELL)
        .setLabel('Продать')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423966433884373052'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.AUCTION)
        .setLabel('Аукционы')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423965583963328633'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS)
        .setLabel('Сделки')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423975784292552765')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('market_search')
        .setLabel('Купить')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423965832740081684'),
      new ButtonBuilder()
        .setCustomId('market_help')
        .setLabel('Помощь')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423974435228225556')
    );

  return [row1, row2];
}

// Sell item modal
export function createSellModal(selectedCategory = null) {
  const modal = new ModalBuilder()
    .setCustomId(UI_CONSTANTS.MODAL_IDS.SELL_ITEM)
    .setTitle('СОЗДАНИЕ ЛОТА')
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel('Название товара')
            .setPlaceholder('Алмаз, Золото, Оружие...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        ),
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('price')
            .setLabel('Цена за единицу (Септимы)')
            .setPlaceholder('1000')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10)
        ),
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('quantity')
            .setLabel('Количество товара')
            .setPlaceholder('5')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
        )
    );

  // Если категория уже выбрана, добавляем скрытое поле
  if (selectedCategory) {
    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('category')
            .setLabel('Категория товара')
            .setValue(selectedCategory)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50)
        )
    );
  } else {
    // Если категория не выбрана, добавляем поле для ввода
    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('category')
            .setLabel('Категория товара (точно как в списке)')
            .setPlaceholder('Оружие, Снаряжение, Зелья, Еда...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50)
        )
    );
  }

  return modal;
}

// Change quantity modal
export function createChangeQuantityModal(currentQuantity) {
  return new ModalBuilder()
    .setCustomId(UI_CONSTANTS.MODAL_IDS.CHANGE_QUANTITY)
    .setTitle('Изменение количества')
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('new_quantity')
            .setLabel('Новое количество')
            .setPlaceholder(`Текущее: ${currentQuantity}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
        )
    );
}

// Deal control buttons (for both buyer and seller)
export function createDealControlButtons(deal, userInternalId) {
  const row = new ActionRowBuilder();
  const isBuyer = deal.buyerId === userInternalId;
  const isSeller = deal.sellerId === userInternalId;
  
  // Only show controls if user is part of the deal and deal is pending
  if ((isBuyer || isSeller) && deal.status === 'PENDING') {
    // Check if user already confirmed
    const userConfirmed = (isBuyer && deal.buyerConfirmed) || (isSeller && deal.sellerConfirmed);
    
    if (!userConfirmed) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CONFIRM_DEAL}_${deal.id}`)
          .setLabel(TEXTS.DEAL_THREAD.CONFIRM_BUTTON)
          .setStyle(ButtonStyle.Success)
      );
    }
    
    // Only buyer can change quantity before confirmation
    if (isBuyer && !deal.buyerConfirmed) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CHANGE_QUANTITY}_${deal.id}`)
          .setLabel(TEXTS.DEAL_THREAD.CHANGE_QTY_BUTTON)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CANCEL_DEAL}_${deal.id}`)
        .setLabel(TEXTS.DEAL_THREAD.CANCEL_BUTTON)
        .setStyle(ButtonStyle.Danger)
    );
  }

  // Close button for completed or cancelled deals
  if (deal.status !== 'PENDING') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CLOSE_DEAL}_${deal.id}`)
        .setLabel(TEXTS.DEAL_THREAD.CLOSE_BUTTON)
        .setStyle(ButtonStyle.Primary)
    );
  }

  // Return null if no components were added (Discord requires 1-5 components per row)
  return row.components.length > 0 ? row : null;
}

// Deals menu buttons
export function createDealsMenuButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS_HISTORY)
        .setLabel('История')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423973804467814400'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS_ACTIVE)
        .setLabel('Активные')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423975784292552765'),
      new ButtonBuilder()
        .setCustomId('my_deals')
        .setLabel('Мои сделки')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1423975784292552765')
    );
}

// Pagination buttons
export function createPaginationButtons(page, totalPages, prefix) {
  const row = new ActionRowBuilder();

  if (page > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}_prev_${page - 1}`)
        .setLabel('Предыдущая')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (page < totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}_next_${page + 1}`)
        .setLabel('Следующая')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return row.components.length > 0 ? row : null;
}

// Listing select menu
export function createListingSelectMenu(listings) {
  const options = listings.map(listing => ({
    label: listing.itemName.length > 25 ? listing.itemName.substring(0, 22) + '...' : listing.itemName,
    description: `${listing.price} /шт • ${listing.quantityAvailable} шт • ${listing.category || 'Без категории'}`,
    value: listing.id,
    emoji: '1423962783535337552'
  }));

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(UI_CONSTANTS.SELECT_IDS.LISTING_SELECT)
        .setPlaceholder('Выберите товар для покупки...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options.slice(0, 25)) // Discord limit
    );
}

// Category select menu
export function createCategorySelectMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('category_filter')
        .setPlaceholder('Выберите категорию для фильтрации...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
          {
            label: 'Все категории',
            value: 'all',
            description: 'Показать все товары',
            emoji: '1423962783535337552'
          },
          ...UI_CONSTANTS.CATEGORIES.map(category => ({
            label: category,
            value: category,
            description: `Товары категории: ${category}`,
            emoji: '1423962783535337552'
          }))
        ])
    );
}

export function createSellCategorySelectMenu() {
  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('sell_category_selection')
        .setPlaceholder('Выберите категорию для продажи...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          UI_CONSTANTS.CATEGORIES.map(category => ({
            label: category,
            value: category,
            description: `Создать лот в категории ${category}`,
            emoji: '1423962783535337552'
          }))
        )
    );
}

// Deal thread embed
export function createDealThreadEmbed(deal, listing) {
  const totalPrice = deal.price * deal.quantity;
  
  // Create confirmation status
  let confirmationStatus = '';
  let statusEmoji = '';
  if (deal.status === 'PENDING') {
    const buyerStatus = deal.buyerConfirmed ? 'Подтвердил' : 'Ожидает';
    const sellerStatus = deal.sellerConfirmed ? 'Подтвердил' : 'Ожидает';
    confirmationStatus = `**Покупатель:** ${buyerStatus}\n**Продавец:** ${sellerStatus}`;
    statusEmoji = '';
  } else {
    confirmationStatus = deal.status === 'COMPLETED' ? '**Сделка завершена**' : '**Сделка отменена**';
    statusEmoji = '';
  }
  
  // Get seller name from listing or use Discord ID
  const sellerName = listing && listing.seller ? `<@${listing.seller.discordId}>` : `<@${deal.sellerId}>`;
  
  return new EmbedBuilder()
    .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СДЕЛКА #${deal.id} ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\`

**Покупка:** ${deal.itemName}
**Продавец:** ${sellerName}`)
    .setColor(0x7b9e1e)
    .addFields(
      {
        name: '**Детали товара**',
        value: `**Количество**\n> ${deal.quantity} шт\n\n**Цена за единицу**\n> ${deal.price} <:steamworkshop_collection_8776158:1423962802640650351>\n\n**Общая стоимость**\n> ${totalPrice} <:steamworkshop_collection_8776158:1423962802640650351>`,
        inline: true,
      },
      {
        name: '**Статус подтверждения**',
        value: confirmationStatus,
        inline: true,
      },
      {
        name: '**Время создания**',
        value: `> <t:${Math.floor(new Date(deal.createdAt).getTime() / 1000)}:R>`,
        inline: true,
      }
    )
    .setTimestamp()
    .setFooter({ 
      text: `ID сделки: ${deal.id}`,
    });
}

// Deal embed
export function createDealEmbed(deal) {
  const totalPrice = deal.price * deal.quantity;
  const statusEmoji = '';
  
  const embed = new EmbedBuilder()
    .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ СДЕЛКА #${deal.id} ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
    .setColor(deal.status === 'COMPLETED' ? EMBED_COLORS.SUCCESS : 
              deal.status === 'CANCELLED' ? EMBED_COLORS.ERROR : EMBED_COLORS.WARNING)
    .addFields(
      {
        name: '**Товар**',
        value: `> ${deal.itemName}`,
        inline: true,
      },
      {
        name: '**Количество**',
        value: `> ${deal.quantity}`,
        inline: true,
      },
      {
        name: '**Цена за единицу**',
        value: `> ${deal.price} <:steamworkshop_collection_8776158:1423962802640650351>`,
        inline: true,
      },
      {
        name: '**Общая стоимость**',
        value: `> ${totalPrice} <:steamworkshop_collection_8776158:1423962802640650351>`,
        inline: true,
      },
      {
        name: '**Продавец**',
        value: `> <@${deal.seller.discordId}>`,
        inline: true,
      },
      {
        name: '**Покупатель**',
        value: `> <@${deal.buyer.discordId}>`,
        inline: true,
      },
      {
        name: '**Статус**',
        value: `> ${deal.status}`,
        inline: true,
      }
    )
    .setTimestamp(new Date(deal.createdAt));

  return embed;
}

// Listing embed
export function createListingEmbed(listing) {
  const embed = new EmbedBuilder()
    .setDescription(`\`\`\` ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ${listing.itemName} ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\`\`\``)
    .setColor(0x7b9e1e)
    .addFields(
      {
        name: '**Цена за единицу**',
        value: `> ${listing.price} <:steamworkshop_collection_8776158:1423962802640650351>`,
        inline: true,
      },
      {
        name: '**Доступно**',
        value: `> ${listing.quantityAvailable}`,
        inline: true,
      },
      {
        name: '**Категория**',
        value: `> ${listing.category || 'Не указана'}`,
        inline: true,
      },
      {
        name: '**Продавец**',
        value: `> <@${listing.seller.discordId}>`,
        inline: true,
      }
    )
    .setTimestamp(new Date(listing.createdAt))
    .setFooter({ text: `ID: ${listing.id}` });


  return embed;
}
