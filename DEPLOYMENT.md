# 🚀 Руководство по развертыванию Economy Discord Bot

## 📋 Предварительные требования

### Системные требования
- **ОС**: Linux (Ubuntu 20.04+), macOS, или Windows с WSL2
- **RAM**: Минимум 2GB, рекомендуется 4GB+
- **Диск**: Минимум 5GB свободного места
- **CPU**: 2+ ядра

### Программное обеспечение
- **Docker** 20.10+ и **Docker Compose** 2.0+
- **Git** для клонирования репозитория

## 🔧 Установка и настройка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd Economy-Discord-Bot
```

### 2. Настройка переменных окружения

```bash
# Копируем пример конфигурации
cp env.example .env

# Редактируем конфигурацию
nano .env
```

**Обязательные переменные для настройки:**

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_server_id_here

# Database Configuration (для Docker не нужно менять)
DATABASE_URL=postgresql://economy_user:economy_password@postgres:5432/economy_bot

# Redis Configuration (для Docker не нужно менять)
REDIS_URL=redis://redis:6379

# Bot Configuration
CURRENCY_NAME=золото
ADMIN_ROLE_ID=admin_role_id_here
MODERATOR_ROLE_ID=moderator_role_id_here
AUCTION_ROLE_ID=auction_role_id_here
MAX_ACTIVE_LOTS_PER_USER=10
```

### 3. Настройка Discord бота

#### 3.1 Создание приложения в Discord Developer Portal

1. Перейдите на [Discord Developer Portal](https://discord.com/developers/applications)
2. Нажмите "New Application"
3. Введите название приложения (например, "Economy Bot")
4. Скопируйте **Application ID** → это ваш `DISCORD_CLIENT_ID`

#### 3.2 Создание бота

1. В разделе "Bot" нажмите "Add Bot"
2. Скопируйте **Token** → это ваш `DISCORD_TOKEN`
3. В разделе "Privileged Gateway Intents" включите:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

#### 3.3 Приглашение бота на сервер

1. Перейдите в раздел "OAuth2" → "URL Generator"
2. Выберите:
   - ✅ `bot`
   - ✅ `applications.commands`
3. В разделе "Bot Permissions" выберите:
   - ✅ Send Messages
   - ✅ Manage Channels
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Embed Links
   - ✅ Attach Files
4. Скопируйте сгенерированную ссылку и откройте её
5. Выберите сервер и нажмите "Authorize"

#### 3.4 Настройка ролей

1. Создайте роли на сервере:
   - **Администратор** (для управления ботом)
   - **Модератор** (для модерации сделок)
   - **Аукционер** (для создания аукционов)
2. Скопируйте ID ролей (ПКМ на роли → "Copy ID")
3. Добавьте ID в `.env` файл

## 🐳 Развертывание через Docker

### Автоматическое развертывание

```bash
# Запуск скрипта развертывания
./scripts/deploy.sh
```

### Ручное развертывание

```bash
# 1. Остановка существующих контейнеров
docker-compose down

# 2. Сборка и запуск
docker-compose up -d --build

# 3. Проверка статуса
docker-compose ps

# 4. Просмотр логов
docker-compose logs -f discord_bot
```

## 🔍 Проверка работоспособности

### 1. Проверка контейнеров

```bash
docker-compose ps
```

Должны быть запущены:
- `economy_bot_postgres` (статус: Up)
- `economy_bot_redis` (статус: Up)
- `economy_discord_bot` (статус: Up)

### 2. Проверка логов

```bash
# Логи бота
docker-compose logs discord_bot

# Логи базы данных
docker-compose logs postgres

# Логи Redis
docker-compose logs redis
```

### 3. Проверка в Discord

1. Убедитесь, что бот онлайн (зеленый индикатор)
2. Попробуйте команду `/market`
3. Проверьте создание главного меню

## 🛠 Управление

### Основные команды

```bash
# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Перезапуск бота
docker-compose restart discord_bot

# Остановка всех сервисов
docker-compose down

# Обновление бота
docker-compose pull
docker-compose up -d --build
```

### Резервное копирование

```bash
# Создание бэкапа базы данных
docker-compose exec postgres pg_dump -U economy_user economy_bot > backup.sql

# Восстановление из бэкапа
docker-compose exec -T postgres psql -U economy_user economy_bot < backup.sql
```

## 🔧 Настройка мониторинга

### Логи

Логи сохраняются в:
- `logs/combined.log` - все события
- `logs/error.log` - только ошибки

### Мониторинг через Docker

```bash
# Статистика использования ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f --tail=100
```

## 🚨 Устранение неполадок

### Частые проблемы

#### 1. Бот не запускается

**Проблема**: Ошибка подключения к Discord
**Решение**: Проверьте `DISCORD_TOKEN` в `.env`

#### 2. Ошибка подключения к базе данных

**Проблема**: `Connection refused` к PostgreSQL
**Решение**: 
```bash
docker-compose restart postgres
docker-compose logs postgres
```

#### 3. Бот не отвечает на команды

**Проблема**: Команды не регистрируются
**Решение**: 
```bash
# Перезапуск бота
docker-compose restart discord_bot

# Проверка логов
docker-compose logs discord_bot
```

#### 4. Ошибки прав доступа

**Проблема**: Бот не может создавать каналы
**Решение**: Проверьте права бота на сервере Discord

### Полезные команды для диагностики

```bash
# Проверка подключения к базе данных
docker-compose exec discord_bot node -e "require('./src/database/connection').db.query('SELECT 1')"

# Проверка Redis
docker-compose exec redis redis-cli ping

# Просмотр переменных окружения
docker-compose exec discord_bot env | grep DISCORD
```

## 📈 Масштабирование

### Для больших серверов (1000+ пользователей)

1. **Увеличьте ресурсы**:
   ```yaml
   # В docker-compose.yml
   discord_bot:
     deploy:
       resources:
         limits:
           memory: 1G
           cpus: '1.0'
   ```

2. **Настройте Redis для кеширования**:
   ```env
   REDIS_MAXMEMORY=256mb
   REDIS_MAXMEMORY_POLICY=allkeys-lru
   ```

3. **Оптимизируйте базу данных**:
   ```sql
   -- Добавьте индексы для больших таблиц
   CREATE INDEX CONCURRENTLY idx_items_search ON items USING gin(to_tsvector('russian', title || ' ' || COALESCE(description, '')));
   ```

## 🔄 Обновления

### Обновление бота

```bash
# 1. Остановка сервисов
docker-compose down

# 2. Получение обновлений
git pull origin main

# 3. Пересборка и запуск
docker-compose up -d --build

# 4. Проверка
docker-compose logs -f discord_bot
```

### Миграции базы данных

```bash
# Запуск миграций
docker-compose exec discord_bot npm run migrate
```

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи**: `docker-compose logs -f`
2. **Проверьте статус**: `docker-compose ps`
3. **Проверьте конфигурацию**: `.env` файл
4. **Создайте Issue** в репозитории с логами ошибок

---

**Примечание**: Убедитесь, что у вас есть права администратора на сервере Discord для настройки ролей и прав бота.
