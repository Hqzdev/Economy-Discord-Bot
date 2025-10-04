// UI Constants
export const UI_CONSTANTS = {
  // Button IDs
  BUTTON_IDS: {
    BUY: 'market_buy',
    SELL: 'market_sell',
    AUCTION: 'market_auction',
    DEALS: 'market_deals',
    CONFIRM_DEAL: 'deal_confirm',
    CANCEL_DEAL: 'deal_cancel',
    CHANGE_QUANTITY: 'deal_change_qty',
    CLOSE_DEAL: 'deal_close',
    DEALS_HISTORY: 'deals_history',
    DEALS_ACTIVE: 'deals_active',
    LISTING_PREV_PAGE: 'listing_prev',
    LISTING_NEXT_PAGE: 'listing_next',
    DEALS_PREV_PAGE: 'deals_prev',
    DEALS_NEXT_PAGE: 'deals_next',
  },

  // Modal IDs
  MODAL_IDS: {
    SELL_ITEM: 'sell_item_modal',
    CHANGE_QUANTITY: 'change_quantity_modal',
  },

  // Select Menu IDs
  SELECT_IDS: {
    LISTING_SELECT: 'listing_select',
    DEAL_SELECT: 'deal_select',
  },

  // Pagination
  ITEMS_PER_PAGE: 10,

  // Timeouts
  INTERACTION_TIMEOUT: 300000, // 5 minutes
  DEAL_TIMEOUT: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
};

// Text Constants (Russian)
export const TEXTS = {
  // Main Menu
  MAIN_MENU: {
    TITLE: '🏪 Рынок Ролевого Сервера',
    DESCRIPTION: 'Выберите действие:',
    BUY_BUTTON: '🛒 Купить',
    SELL_BUTTON: '💰 Продать',
    AUCTION_BUTTON: '🔨 Аукцион',
    DEALS_BUTTON: '📋 Сделки',
  },

  // Sell Modal
  SELL_MODAL: {
    TITLE: 'Создание лота',
    ITEM_NAME_LABEL: 'Название товара',
    ITEM_NAME_PLACEHOLDER: 'Введите название товара',
    PRICE_LABEL: 'Цена за единицу',
    PRICE_PLACEHOLDER: 'Введите цену',
    QUANTITY_LABEL: 'Количество',
    QUANTITY_PLACEHOLDER: 'Введите количество',
  },

  // Buy Interface
  BUY: {
    TITLE: '🛒 Покупка товаров',
    NO_LISTINGS: 'Активных лотов не найдено',
    SEARCH_PLACEHOLDER: 'Поиск по названию...',
    SELECT_PROMPT: 'Выберите лот для покупки:',
  },

  // Deal Thread
  DEAL_THREAD: {
    TITLE: 'Сделка #{dealId}',
    DESCRIPTION: 'Покупка {itemName} у {sellerName}',
    BUYER_CONTROLS: 'Управление сделкой (только для покупателя)',
    CONFIRM_BUTTON: '✅ Подтвердить',
    CANCEL_BUTTON: '❌ Отменить',
    CHANGE_QTY_BUTTON: '📝 Изменить количество',
    CLOSE_BUTTON: '🔒 Закрыть сделку',
    CURRENT_QUANTITY: 'Количество: {quantity}',
    TOTAL_PRICE: 'Цена в игре: {total} монет',
    STATUS_PENDING: '⏳ Ожидает подтверждения',
    STATUS_COMPLETED: '✅ Завершена',
    STATUS_CANCELLED: '❌ Отменена',
  },

  // Deals
  DEALS: {
    TITLE: '📋 Управление сделками',
    HISTORY_BUTTON: '📜 История сделок',
    ACTIVE_BUTTON: '🔄 Активные сделки',
    HISTORY_TITLE: '📜 История сделок',
    ACTIVE_TITLE: '🔄 Активные сделки',
    NO_DEALS: 'Сделок не найдено',
    DEAL_INFO: 'Сделка #{id} — {item}, {qty} × {price} = {total} (в игре); {seller} → {buyer}; статус: {status}; дата: {date}',
  },

  // Auction
  AUCTION: {
    TITLE: '🔨 Аукционы',
    CREATE_BUTTON: '➕ Создать аукцион',
    NO_AUCTIONS: 'Активных аукционов нет',
    SCHEDULED: 'Запланирован',
    CLOSED: 'Завершён',
    START_TIME: 'Время начала: {time}',
    DESCRIPTION: 'Описание: {description}',
  },

  // Balance (removed - handled in-game)

  // Errors
  ERRORS: {
    INSUFFICIENT_PERMISSIONS: '❌ Недостаточно прав для выполнения действия',
    LISTING_NOT_FOUND: '❌ Лот не найден или уже закрыт',
    INSUFFICIENT_QUANTITY: '❌ Недостаточно доступного количества: осталось {qty}',
    INSUFFICIENT_STOCK: '❌ Недостаточно товара на складе',
    INVALID_QUANTITY: '❌ Количество должно быть целым числом больше 0',
    INVALID_PRICE: '❌ Цена должна быть положительным числом',
    ONLY_BUYER_CONTROL: '❌ Только участники сделки могут управлять ею',
    ALREADY_CONFIRMED: '❌ Вы уже подтвердили эту сделку',
    DEAL_NOT_FOUND: '❌ Сделка не найдена',
    USER_NOT_FOUND: '❌ Пользователь не найден',
    AUCTIONEER_ONLY: '❌ Только роль Аукционер может создавать аукционы',
    DEAL_TIMEOUT: '❌ Сделка истекла по времени',
    MAX_LISTINGS_EXCEEDED: '❌ Превышено максимальное количество активных лотов',
    MAX_DEALS_EXCEEDED: '❌ Превышено максимальное количество активных сделок',
    INTERNAL_ERROR: '❌ Произошла внутренняя ошибка. Попробуйте позже.',
  },

  // Success Messages
  SUCCESS: {
    LISTING_CREATED: '✅ Лот успешно создан',
    DEAL_CREATED: '✅ Сделка создана. Проверьте приватную ветку',
    DEAL_COMPLETED: '✅ Сделка успешно завершена',
    DEAL_CANCELLED: '✅ Сделка отменена',
    AUCTION_CREATED: '✅ Аукцион успешно создан',
    QUANTITY_CHANGED: '✅ Количество изменено',
  },
};

// Embed Colors
export const EMBED_COLORS = {
  PRIMARY: 0x3498db,
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  ERROR: 0xe74c3c,
  INFO: 0x9b59b6,
};

// Rate Limiting
export const RATE_LIMITS = {
  INTERACTION_DELAY: 1000, // 1 second between interactions
  DEAL_CREATION_DELAY: 5000, // 5 seconds between deal creations
};
