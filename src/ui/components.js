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
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.BUY)
        .setLabel(TEXTS.MAIN_MENU.BUY_BUTTON)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛒'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.SELL)
        .setLabel(TEXTS.MAIN_MENU.SELL_BUTTON)
        .setStyle(ButtonStyle.Success)
        .setEmoji('💰'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.AUCTION)
        .setLabel(TEXTS.MAIN_MENU.AUCTION_BUTTON)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔨'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS)
        .setLabel(TEXTS.MAIN_MENU.DEALS_BUTTON)
        .setStyle(ButtonStyle.Danger)
        .setEmoji('📋')
    );
}

// Sell item modal
export function createSellModal() {
  return new ModalBuilder()
    .setCustomId(UI_CONSTANTS.MODAL_IDS.SELL_ITEM)
    .setTitle(TEXTS.SELL_MODAL.TITLE)
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel(TEXTS.SELL_MODAL.ITEM_NAME_LABEL)
            .setPlaceholder(TEXTS.SELL_MODAL.ITEM_NAME_PLACEHOLDER)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        ),
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('price')
            .setLabel(TEXTS.SELL_MODAL.PRICE_LABEL)
            .setPlaceholder(TEXTS.SELL_MODAL.PRICE_PLACEHOLDER)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10)
        ),
      new ActionRowBuilder()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('quantity')
            .setLabel(TEXTS.SELL_MODAL.QUANTITY_LABEL)
            .setPlaceholder(TEXTS.SELL_MODAL.QUANTITY_PLACEHOLDER)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
        )
    );
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
          .setEmoji('✅')
      );
    }
    
    // Only buyer can change quantity before confirmation
    if (isBuyer && !deal.buyerConfirmed) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CHANGE_QUANTITY}_${deal.id}`)
          .setLabel(TEXTS.DEAL_THREAD.CHANGE_QTY_BUTTON)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📝')
      );
    }
    
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CANCEL_DEAL}_${deal.id}`)
        .setLabel(TEXTS.DEAL_THREAD.CANCEL_BUTTON)
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );
  }

  // Close button for completed or cancelled deals
  if (deal.status !== 'PENDING') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${UI_CONSTANTS.BUTTON_IDS.CLOSE_DEAL}_${deal.id}`)
        .setLabel(TEXTS.DEAL_THREAD.CLOSE_BUTTON)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔒')
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
        .setLabel(TEXTS.DEALS.HISTORY_BUTTON)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜'),
      new ButtonBuilder()
        .setCustomId(UI_CONSTANTS.BUTTON_IDS.DEALS_ACTIVE)
        .setLabel(TEXTS.DEALS.ACTIVE_BUTTON)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );
}

// Pagination buttons
export function createPaginationButtons(page, totalPages, prefix) {
  const row = new ActionRowBuilder();

  if (page > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}_prev_${page - 1}`)
        .setLabel('◀️ Предыдущая')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (page < totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${prefix}_next_${page + 1}`)
        .setLabel('Следующая ▶️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return row.components.length > 0 ? row : null;
}

// Listing select menu
export function createListingSelectMenu(listings) {
  const options = listings.map(listing => ({
    label: listing.itemName,
    description: `${listing.price} монет за единицу | Остаток: ${listing.quantityAvailable} | Продавец: ${listing.seller.discordId}`,
    value: listing.id,
  }));

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(UI_CONSTANTS.SELECT_IDS.LISTING_SELECT)
        .setPlaceholder(TEXTS.BUY.SELECT_PROMPT)
        .addOptions(options.slice(0, 25)) // Discord limit
    );
}

// Deal thread embed
export function createDealThreadEmbed(deal, listing) {
  const totalPrice = deal.price * deal.quantity;
  
  // Create confirmation status
  let confirmationStatus = '';
  if (deal.status === 'PENDING') {
    const buyerStatus = deal.buyerConfirmed ? '✅ Подтвердил' : '⏳ Ожидает';
    const sellerStatus = deal.sellerConfirmed ? '✅ Подтвердил' : '⏳ Ожидает';
    confirmationStatus = `**Покупатель:** ${buyerStatus}\n**Продавец:** ${sellerStatus}`;
  } else {
    confirmationStatus = deal.status === 'COMPLETED' ? '✅ Завершена' : '❌ Отменена';
  }
  
  // Get seller name from listing or use Discord ID
  const sellerName = listing && listing.seller ? `<@${listing.seller.discordId}>` : `<@${deal.sellerId}>`;
  
  return new EmbedBuilder()
    .setTitle(`Сделка #${deal.id}`)
    .setDescription(`Покупка ${deal.itemName} у ${sellerName}`)
    .setColor(deal.status === 'COMPLETED' ? EMBED_COLORS.SUCCESS : 
              deal.status === 'CANCELLED' ? EMBED_COLORS.ERROR : EMBED_COLORS.PRIMARY)
    .addFields(
      {
        name: `Количество: ${deal.quantity}`,
        value: `${deal.quantity} штук`,
        inline: true,
      },
      {
        name: `Цена в игре: ${totalPrice} монет`,
        value: `${totalPrice} монет (в игре)`,
        inline: true,
      },
      {
        name: 'Статус подтверждения',
        value: confirmationStatus,
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({ text: `ID сделки: ${deal.id}` });
}

// Deal embed
export function createDealEmbed(deal) {
  const totalPrice = deal.price * deal.quantity;
  const statusEmoji = deal.status === 'PENDING' ? '⏳' : 
                     deal.status === 'COMPLETED' ? '✅' : '❌';
  
  const embed = new EmbedBuilder()
    .setTitle(`Сделка #${deal.id}`)
    .setColor(deal.status === 'COMPLETED' ? EMBED_COLORS.SUCCESS : 
              deal.status === 'CANCELLED' ? EMBED_COLORS.ERROR : EMBED_COLORS.WARNING)
    .addFields(
      {
        name: 'Товар',
        value: deal.itemName,
        inline: true,
      },
      {
        name: 'Количество',
        value: deal.quantity.toString(),
        inline: true,
      },
      {
        name: 'Цена за единицу',
        value: `${deal.price} монет`,
        inline: true,
      },
      {
        name: 'Общая стоимость',
        value: `${totalPrice} монет`,
        inline: true,
      },
      {
        name: 'Продавец',
        value: `<@${deal.seller.discordId}>`,
        inline: true,
      },
      {
        name: 'Покупатель',
        value: `<@${deal.buyer.discordId}>`,
        inline: true,
      },
      {
        name: 'Статус',
        value: `${statusEmoji} ${deal.status}`,
        inline: true,
      }
    )
    .setTimestamp(new Date(deal.createdAt));

  return embed;
}

// Listing embed
export function createListingEmbed(listing) {
  const embed = new EmbedBuilder()
    .setTitle(`📦 ${listing.itemName}`)
    .setColor(EMBED_COLORS.INFO)
    .addFields(
      {
        name: 'Цена за единицу',
        value: `${listing.price} монет`,
        inline: true,
      },
      {
        name: 'Доступно',
        value: listing.quantityAvailable.toString(),
        inline: true,
      },
      {
        name: 'Продавец',
        value: `<@${listing.seller.discordId}>`,
        inline: true,
      }
    )
    .setTimestamp(new Date(listing.createdAt))
    .setFooter({ text: `ID: ${listing.id}` });

  return embed;
}
