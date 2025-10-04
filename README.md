# Discord Market Bot

Полнофункциональный Discord-бот для ролевого сервера с системой торговли, аукционов и управления экономикой.

## 🚀 Возможности

- **🏪 Рынок товаров**: Создание и покупка лотов с автоматическим управлением остатками
- **🔨 Аукционы**: Создание аукционов (только для роли "Аукционер")
- **📋 Управление сделками**: Приватные ветки для каждой сделки с контролем покупателя
- **🛡️ Безопасность**: Валидация входных данных, анти-спам, rate limiting
- **📊 Аудит**: Логирование всех действий пользователей
- **🧪 Тестирование**: Покрытие тестами критической логики

## 📋 Требования

- Node.js 18+ 
- Discord.js v14
- SQLite (через Prisma)
- Права бота: `ManageThreads`, `ManageChannels`, `ReadMessageHistory`, `SendMessages`, `UseApplicationCommands`, `CreatePrivateThreads`

## 🛠️ Установка

1. **Клонирование репозитория**
```bash
git clone <repository-url>
cd discord-market-bot
```

2. **Установка зависимостей**
```bash
npm install
```

3. **Настройка окружения**
```bash
cp env.example .env
```

Отредактируйте `.env` файл:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_guild_id_here
MARKET_CHANNEL_ID=your_market_channel_id_here
AUCTIONEER_ROLE_ID=your_auctioneer_role_id_here

# Database Configuration
DATABASE_URL="file:./data/market.db"

# Bot Configuration
DEAL_TIMEOUT_HOURS=12
MAX_LISTINGS_PER_USER=10
MAX_ACTIVE_DEALS_PER_USER=5

# Logging
LOG_LEVEL=info
```

4. **Настройка базы данных**
```bash
npm run db:generate
npm run db:migrate
```

5. **Запуск бота**
```bash
npm start
```

Для разработки:
```bash
npm run dev
```

## 🎮 Использование

### Основные команды

#### 🏪 Рынок
- `/market` - Показать главное меню рынка с кнопками для покупки, продажи, аукционов и сделок

#### 🔨 Аукционы
- `/auction create name: "Товар" start_time: "2024-01-01 15:00" description: "Описание"` - Создать аукцион (только для роли "Аукционер")
- `/auction list` - Показать активные аукционы


### Основной функционал

1. **Продажа товаров**
   - Нажмите кнопку "Продать" в главном меню
   - Заполните модалку: название, цена, количество
   - Лот становится активным и попадает в общий рынок

2. **Покупка товаров**
   - Нажмите кнопку "Купить"
   - Выберите товар из списка активных лотов
   - Создастся приватная ветка для сделки
   - Только покупатель может управлять сделкой

3. **Управление сделками**
   - Кнопка "Сделки" → "Активные сделки" - ваши незавершённые сделки
   - Кнопка "Сделки" → "История сделок" - завершённые сделки

4. **Аукционы**
   - Кнопка "Аукцион" - просмотр активных аукционов
   - Создание аукционов доступно только роли "Аукционер"

## 🏗️ Архитектура

```
src/
├── commands/          # Слэш-команды Discord
├── handlers/          # Обработчики интеракций (кнопки, модалки)
├── services/          # Бизнес-логика
│   ├── userService.js
│   ├── listingService.js
│   ├── dealService.js
│   ├── auctionService.js
│   └── auditService.js
├── ui/               # UI компоненты (кнопки, модалки, селекты)
├── utils/            # Утилиты (валидация, безопасность, константы)
├── config/           # Конфигурация
└── database/         # Подключение к БД
```

### Основные сервисы

- **UserService**: Управление пользователями и складами
- **ListingService**: CRUD лотов, поиск, сортировка
- **DealService**: Создание, подтверждение, отмена сделок
- **AuctionService**: Управление аукционами
- **AuditService**: Логирование действий

## 🗄️ База данных

Схема базы данных (Prisma):

```prisma
model User {
  id        String   @id @default(cuid())
  discordId String   @unique
  stocks    Stock[]
  listings  Listing[]
  deals     Deal[]
  auctions  Auction[]
}

model Stock {
  id             String @id @default(cuid())
  userId         String
  itemName       String
  quantityTotal  Int
}

model Listing {
  id                String      @id @default(cuid())
  sellerId          String
  itemName          String
  price             Int
  quantityAvailable Int
  status            ListingStatus
}

model Deal {
  id        String     @id @default(cuid())
  listingId String
  buyerId   String
  sellerId  String
  itemName  String
  price     Int
  quantity  Int
  status    DealStatus
  threadId  String?
}

model Auction {
  id          String        @id @default(cuid())
  creatorId   String
  itemName    String
  startTime   DateTime
  description String?
  status      AuctionStatus
}
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
npm test

# Запуск тестов в режиме наблюдения
npm run test:watch

# Покрытие кода
npm test -- --coverage
```

Тесты покрывают:
- Валидацию входных данных
- Бизнес-логику сервисов
- Критические сценарии (создание сделок, подтверждение)
- Конкурентные обновления

## 🔧 Разработка

### Структура проекта

- **Команды**: Каждая слэш-команда в отдельном файле
- **Обработчики**: Отдельные классы для кнопок, модалок, селектов
- **Сервисы**: Чистая архитектура с разделением ответственности
- **UI**: Переиспользуемые компоненты интерфейса

### Добавление новых команд

1. Создайте файл в `src/commands/`
2. Экспортируйте `data` (SlashCommandBuilder) и `execute` функцию
3. Добавьте команду в `src/commands/index.js`
4. Перезапустите бота

### Добавление новых сервисов

1. Создайте файл в `src/services/`
2. Используйте Prisma для работы с БД
3. Добавьте валидацию входных данных
4. Логируйте действия через AuditService

## 🛡️ Безопасность

- **Валидация**: Все входные данные проверяются и санитизируются
- **Rate Limiting**: Ограничение частоты действий пользователей
- **Анти-спам**: Детекция подозрительных паттернов
- **Права доступа**: Проверка ролей и разрешений
- **Аудит**: Логирование всех критических действий

## 📊 Мониторинг

- Логи сохраняются в файлы `logs/error.log` и `logs/combined.log`
- Аудит действий в таблице `audit_log`
- Автоматическая очистка истёкших сделок (каждый час)
- Очистка старых логов (ежедневно)

## 🚀 Развёртывание

### Docker (опционально)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run db:generate
CMD ["npm", "start"]
```

### Системные требования

- **RAM**: Минимум 512MB, рекомендуется 1GB
- **CPU**: 1 vCPU достаточно для небольших серверов
- **Диск**: 100MB для приложения + место для логов и БД
- **Сеть**: Стабильное интернет-соединение

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📝 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи в `logs/error.log`
2. Убедитесь, что все переменные окружения настроены
3. Проверьте права бота на сервере
4. Создайте Issue с описанием проблемы

## 📈 Планы развития

- [ ] Интеграция с внешними API для ценообразования
- [ ] Веб-панель администратора
- [ ] Система рейтингов продавцов
- [ ] Уведомления о сделках
- [ ] Экспорт данных в CSV/JSON
- [ ] Поддержка нескольких валют
- [ ] Система купонов и скидок
