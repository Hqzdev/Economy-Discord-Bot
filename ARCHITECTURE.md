# 🏗️ Архитектура Economy Discord Bot

## 📊 Общая схема системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord API   │    │   Discord Bot   │    │   PostgreSQL    │
│                 │◄──►│                 │◄──►│   Database      │
│  - Guilds       │    │  - Commands     │    │  - Users        │
│  - Messages     │    │  - Interactions │    │  - Items        │
│  - Channels     │    │  - Events       │    │  - Deals        │
└─────────────────┘    └─────────────────┘    │  - Auctions      │
                                           │  - Bids          │
                                           └─────────────────┘
                                                      ▲
                                                      │
                                           ┌─────────────────┐
                                           │     Redis       │
                                           │   Cache/Queue   │
                                           └─────────────────┘
```

## 🔧 Компоненты системы

### 1. Discord Bot Core (`src/index.js`)
- **Назначение**: Основной файл бота, обработка событий Discord
- **Функции**:
  - Инициализация клиента Discord
  - Обработка взаимодействий (команды, кнопки, модальные окна)
  - Управление состоянием бота

### 2. Модели данных (`src/models/`)

#### User.js
```javascript
// Управление пользователями Discord
- discordId: string
- username: string  
- roles: string[]
- isAdmin(): boolean
- isModerator(): boolean
- canCreateAuction(): boolean
```

#### Item.js
```javascript
// Управление товарами/лотами
- id: number
- sellerId: string
- title: string
- description: string
- price: number
- quantity: number
- category: string
- status: 'active' | 'closed' | 'sold'
```

#### Deal.js
```javascript
// Управление сделками
- id: number
- itemId: number
- buyerId: string
- sellerId: string
- channelId: string
- status: 'active' | 'closed' | 'canceled' | 'completed'
- price: number
- quantity: number
```

#### Auction.js
```javascript
// Управление аукционами
- id: number
- itemId: number
- createdBy: string
- startTime: Date
- endTime: Date
- minBid: number
- step: number
- status: 'active' | 'ended' | 'canceled'
```

### 3. База данных (`src/database/`)

#### connection.js
- Подключение к PostgreSQL
- Подключение к Redis
- Вспомогательные функции для работы с БД

#### schema.sql
- Схема базы данных
- Индексы для оптимизации
- Триггеры для автоматического обновления

#### migrate.js
- Миграции базы данных
- Создание таблиц и индексов

### 4. Команды (`src/commands/`)

#### market.js
```javascript
// Слэш-команда /market
- Открытие главного меню
- Навигация по функциям бота
```

#### stats.js
```javascript
// Слэш-команда /stats
- Статистика рынка
- Количество активных лотов/сделок
- Общий оборот
```

### 5. Сервисы (`src/services/`)

#### auctionService.js
```javascript
// Обработка аукционов
- processEndedAuctions(): Автоматическое завершение аукционов
- startAuctionProcessor(): Периодическая обработка
```

### 6. Утилиты (`src/utils/`)

#### logger.js
- Логирование с Winston
- Разные уровни логирования
- Ротация логов

#### validation.js
```javascript
// Валидация данных
- validatePrice(price): Проверка цены
- validateQuantity(quantity): Проверка количества
- validateTitle(title): Проверка названия
- validateDiscordId(id): Проверка ID Discord
```

#### embeds.js
```javascript
// Создание встроенных сообщений
- createMainMenuEmbed(): Главное меню
- createItemEmbed(): Карточка товара
- createDealEmbed(): Карточка сделки
- createAuctionEmbed(): Карточка аукциона
```

## 🔄 Поток данных

### 1. Создание лота
```
Пользователь → /market → Продать → Модальная форма → Item.create() → База данных
```

### 2. Покупка товара
```
Пользователь → /market → Купить → Выбор товара → Deal.create() → Приватный канал
```

### 3. Аукцион
```
Пользователь с ролью → Создание аукциона → Auction.create() → Периодическая обработка
```

### 4. Завершение сделки
```
Участники сделки → Кнопки в канале → Deal.updateStatus() → Обновление Item
```

## 🗄️ Схема базы данных

### Таблица users
```sql
discord_id VARCHAR(20) PRIMARY KEY
username VARCHAR(100) NOT NULL
roles TEXT[] DEFAULT '{}'
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Таблица items
```sql
id SERIAL PRIMARY KEY
seller_id VARCHAR(20) REFERENCES users(discord_id)
title VARCHAR(200) NOT NULL
description TEXT
price DECIMAL(10,2) NOT NULL CHECK (price > 0)
quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1)
category VARCHAR(50)
image_url TEXT
status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'sold'))
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Таблица deals
```sql
id SERIAL PRIMARY KEY
item_id INTEGER REFERENCES items(id)
buyer_id VARCHAR(20) REFERENCES users(discord_id)
seller_id VARCHAR(20) REFERENCES users(discord_id)
channel_id VARCHAR(20)
status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'canceled', 'completed'))
price DECIMAL(10,2) NOT NULL
quantity INTEGER NOT NULL DEFAULT 1
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
closed_at TIMESTAMP
notes TEXT
```

### Таблица auctions
```sql
id SERIAL PRIMARY KEY
item_id INTEGER REFERENCES items(id)
created_by VARCHAR(20) REFERENCES users(discord_id)
start_time TIMESTAMP NOT NULL
end_time TIMESTAMP NOT NULL
min_bid DECIMAL(10,2) NOT NULL CHECK (min_bid > 0)
step DECIMAL(10,2) NOT NULL DEFAULT 1.00 CHECK (step > 0)
status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'canceled'))
winner_id VARCHAR(20) REFERENCES users(discord_id)
final_price DECIMAL(10,2)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Таблица bids
```sql
id SERIAL PRIMARY KEY
auction_id INTEGER REFERENCES auctions(id)
bidder_id VARCHAR(20) REFERENCES users(discord_id)
amount DECIMAL(10,2) NOT NULL CHECK (amount > 0)
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## 🔐 Безопасность

### 1. Валидация данных
- Все входные данные проверяются
- SQL-инъекции предотвращены параметризованными запросами
- Ограничения на размер полей

### 2. Права доступа
- Проверка ролей Discord
- Ограничения на создание аукционов
- Проверка участников сделок

### 3. Логирование
- Все действия записываются в audit_logs
- Ошибки логируются с контекстом
- Ротация логов для экономии места

## 🚀 Производительность

### 1. Индексы базы данных
```sql
-- Основные индексы для оптимизации
CREATE INDEX idx_items_seller ON items(seller_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_deals_buyer ON deals(buyer_id);
CREATE INDEX idx_deals_seller ON deals(seller_id);
CREATE INDEX idx_auctions_status ON auctions(status);
```

### 2. Кеширование
- Redis для кеширования частых запросов
- Кеширование списков товаров
- Кеширование статистики

### 3. Оптимизация запросов
- Пагинация для больших списков
- Ограничение количества результатов
- Эффективные JOIN'ы

## 🔄 Мониторинг

### 1. Логи
- Уровни: error, warn, info, debug
- Ротация по размеру и времени
- Структурированные JSON логи

### 2. Метрики
- Количество активных лотов
- Количество сделок
- Время отклика команд
- Использование памяти

### 3. Health Checks
- Проверка подключения к БД
- Проверка подключения к Redis
- Проверка состояния Discord API

## 🐳 Контейнеризация

### Docker Compose сервисы
1. **postgres**: База данных PostgreSQL
2. **redis**: Кеш и очереди Redis  
3. **discord_bot**: Основное приложение

### Переменные окружения
- Конфигурация через .env файл
- Разделение dev/prod конфигураций
- Безопасное хранение секретов

## 📈 Масштабирование

### Горизонтальное масштабирование
- Несколько экземпляров бота
- Общая база данных
- Синхронизация через Redis

### Вертикальное масштабирование
- Увеличение ресурсов контейнеров
- Оптимизация запросов к БД
- Настройка Redis для больших нагрузок

---

Эта архитектура обеспечивает надежную, масштабируемую и безопасную работу Discord-бота для ролевого проекта.
