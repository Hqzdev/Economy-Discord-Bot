import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { EMBED_COLORS } from '../utils/constants.js';

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Показать справку по командам бота')
  .addStringOption(option =>
    option
      .setName('category')
      .setDescription('Выберите категорию для подробной справки')
      .setRequired(false)
      .addChoices(
        { name: '🏪 Рынок', value: 'market' },
        { name: '🔨 Аукционы', value: 'auction' },
        { name: '⚙️ Администрирование', value: 'admin' },
        { name: '📋 Общая информация', value: 'general' }
      )
  );

async function execute(interaction) {
  try {
    const category = interaction.options.getString('category');

    if (!category) {
      // Показать общую справку
      await showGeneralHelp(interaction);
    } else {
      // Показать справку по конкретной категории
      switch (category) {
        case 'market':
          await showMarketHelp(interaction);
          break;
        case 'auction':
          await showAuctionHelp(interaction);
          break;
        case 'admin':
          await showAdminHelp(interaction);
          break;
        case 'general':
          await showGeneralHelp(interaction);
          break;
      }
    }
  } catch (error) {
    console.error('Error in help command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Произошла ошибка при отображении справки',
        ephemeral: true,
      });
    }
  }
}

async function showGeneralHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📚 Справка по командам бота')
    .setDescription('Выберите категорию для получения подробной информации')
    .setColor(EMBED_COLORS.INFO)
    .addFields(
      {
        name: '🏪 Рынок товаров',
        value: '`/market` - Главное меню рынка\n`/help category:market` - Подробная справка',
        inline: true,
      },
      {
        name: '🔨 Аукционы',
        value: '`/auction` - Управление аукционами\n`/help category:auction` - Подробная справка',
        inline: true,
      },
      {
        name: '⚙️ Администрирование',
        value: '`/admin` - Административные команды\n`/help category:admin` - Подробная справка',
        inline: true,
      }
    )
    .setFooter({ text: 'Используйте кнопки ниже для быстрого доступа к справке' })
    .setTimestamp();

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help_market')
        .setLabel('🏪 Рынок')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('help_auction')
        .setLabel('🔨 Аукционы')
        .setStyle(ButtonStyle.Primary)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help_admin')
        .setLabel('⚙️ Админ')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('help_general')
        .setLabel('📋 Общая')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.reply({
    embeds: [embed],
    components: [row1, row2],
    ephemeral: true,
  });
}

async function showMarketHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🏪 Справка: Рынок товаров')
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields(
      {
        name: '📋 Основная команда',
        value: '`/market` - Открыть главное меню рынка с кнопками для всех действий',
        inline: false,
      },
      {
        name: '🛒 Покупка товаров',
        value: `**Как купить:**
1. Используйте \`/market\` или нажмите кнопку "Купить"
2. Выберите товар из списка активных лотов
3. Создастся приватная ветка для сделки
4. Только вы (покупатель) можете управлять сделкой

**Управление сделкой:**
• Подтвердить покупку
• Отменить сделку
• Просмотреть детали`,
        inline: false,
      },
      {
        name: '💰 Продажа товаров',
        value: `**Как продать:**
1. Используйте \`/market\` или нажмите кнопку "Продать"
2. Заполните модалку:
   • Название товара
   • Цена за единицу
   • Количество
3. Лот становится активным в общем рынке
4. Ждите покупателей

**Управление лотами:**
• Просмотр ваших активных лотов
• Редактирование цены и количества
• Снятие с продажи`,
        inline: false,
      },
      {
        name: '📊 Сделки',
        value: `**Просмотр сделок:**
• "Активные сделки" - ваши незавершённые сделки
• "История сделок" - завершённые сделки

**Статусы сделок:**
• 🟡 Ожидает подтверждения
• 🟢 Подтверждена
• 🔴 Отменена
• ✅ Завершена`,
        inline: false,
      },
      {
        name: '📈 Статистика',
        value: `**Доступная информация:**
• Количество активных лотов
• Количество активных аукционов
• Общее количество сделок
• Ваша личная статистика`,
        inline: false,
      }
    )
    .setFooter({ text: 'Все действия логируются для безопасности' })
    .setTimestamp();

  const backButton = new ButtonBuilder()
    .setCustomId('help_back')
    .setLabel('← Назад к общему списку')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(backButton);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

async function showAuctionHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🔨 Справка: Аукционы')
    .setColor(EMBED_COLORS.SUCCESS)
    .addFields(
      {
        name: '📋 Основные команды',
        value: `\`/auction create\` - Создать аукцион (только для аукционеров)
\`/auction list\` - Показать активные аукционы
\`/auction bid\` - Сделать ставку
\`/auction info\` - Информация об аукционе`,
        inline: false,
      },
      {
        name: '🔨 Создание аукциона',
        value: `**Требования:**
• Роль "Аукционер"
• Минимальная длительность: 1 минута
• Максимальная длительность: 24 часа

**Параметры:**
• \`name\` - Название товара
• \`category\` - Категория (16 вариантов)
• \`duration\` - Длительность в минутах
• \`min_price\` - Минимальная стоимость
• \`image_url\` - Ссылка на изображение (необязательно)
• \`description\` - Описание (необязательно)

**Пример:**
\`/auction create name:"Золотой меч" category:"Оружие" duration:60 min_price:1000 description:"Редкий меч из чистого золота"\``,
        inline: false,
      },
      {
        name: '💰 Участие в аукционе',
        value: `**Просмотр аукционов:**
• \`/auction list\` - Список всех активных аукционов
• \`/auction info auction_id:"ID"\` - Детальная информация

**Ставки:**
• \`/auction bid auction_id:"ID" amount:сумма\`
• Ставка должна быть выше текущей
• Можно делать несколько ставок
• Автоматическое обновление информации

**Категории товаров:**
Оружие, Снаряжение, Зелья, Еда, Ингредиенты, Рыба, Мясо, Слитки, Книги, Драгоценности, Ювелирные изделия, Шкуры, Магическое, Сосуды, Алкоголь, Руда`,
        inline: false,
      },
      {
        name: '⏰ Временные рамки',
        value: `**Длительность аукциона:**
• Минимум: 1 минута
• Максимум: 24 часа (1440 минут)
• Автоматическое завершение по истечении времени

**Завершение аукциона:**
• Победитель определяется по самой высокой ставке
• При отсутствии ставок - аукцион завершается без победителя
• Создаётся лог с результатами`,
        inline: false,
      },
      {
        name: '📊 Информация об аукционе',
        value: `**Доступные данные:**
• ID аукциона
• Название и категория товара
• Создатель аукциона
• Минимальная стоимость
• Время завершения
• Количество ставок
• Текущая максимальная ставка
• Топ-5 ставок
• Победитель (после завершения)`,
        inline: false,
      }
    )
    .setFooter({ text: 'Аукционы создают отдельные ветки для обсуждения' })
    .setTimestamp();

  const backButton = new ButtonBuilder()
    .setCustomId('help_back')
    .setLabel('← Назад к общему списку')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(backButton);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

async function showAdminHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Справка: Администрирование')
    .setColor(EMBED_COLORS.WARNING)
    .addFields(
      {
        name: '🔐 Требования',
        value: 'Все административные команды требуют права **Администратор**',
        inline: false,
      },
      {
        name: '🏪 Управление рынком',
        value: `**\`/admin setup-market\`**
• Создать постоянное сообщение рынка в указанном канале
• Параметр: \`channel\` - канал для размещения

**\`/admin update-market\`**
• Обновить статистику в постоянном сообщении
• Автоматически обновляет количество лотов и аукционов

**\`/admin remove-market\`**
• Удалить постоянное сообщение рынка
• Очищает данные из базы`,
        inline: false,
      },
      {
        name: '🧹 Очистка данных',
        value: `**\`/admin cleanup\`**
• Очистка неактивных записей
• Параметры:
  • \`type\` - тип очистки:
    - "Все неактивные товары"
    - "Все завершённые аукционы" 
    - "Все закрытые сделки"
    - "Всё (товары + аукционы + сделки)"
  • \`confirm\` - подтверждение (обязательно true)

**Что удаляется:**
• Товары с нулевым количеством или неактивные
• Завершённые и отменённые аукционы
• Закрытые, завершённые и отменённые сделки`,
        inline: false,
      },
      {
        name: '📋 Логи аукционов',
        value: `**\`/admin auction-logs\`**
• Просмотр логов завершённых аукционов
• Параметры:
  • \`auction_id\` - ID конкретного аукциона (необязательно)
  • \`limit\` - количество логов (1-50, по умолчанию 10)

**Информация в логах:**
• Детали аукциона
• Список всех ставок
• Победитель и выигрышная сумма
• Время завершения`,
        inline: false,
      },
      {
        name: '⚠️ Важные замечания',
        value: `**Безопасность:**
• Все действия логируются
• Очистка требует подтверждения
• Удалённые данные восстановить нельзя

**Рекомендации:**
• Регулярно обновляйте статистику рынка
• Периодически очищайте старые данные
• Проверяйте логи аукционов для анализа`,
        inline: false,
      }
    )
    .setFooter({ text: 'Административные действия необратимы' })
    .setTimestamp();

  const backButton = new ButtonBuilder()
    .setCustomId('help_back')
    .setLabel('← Назад к общему списку')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(backButton);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

export default { data, execute };
