# Руководство по развёртыванию Discord Market Bot

## 🚀 Быстрый старт

### 1. Подготовка сервера

**Минимальные требования:**
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- 1 vCPU, 1GB RAM, 10GB диска
- Node.js 18+
- Git

**Установка Node.js:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. Создание Discord приложения

1. Перейдите на [Discord Developer Portal](https://discord.com/developers/applications)
2. Создайте новое приложение
3. В разделе "Bot" создайте бота
4. Скопируйте токен бота
5. В разделе "OAuth2" → "URL Generator":
   - Выберите `bot` и `applications.commands`
   - Выберите необходимые права:
     - `Manage Threads`
     - `Manage Channels`
     - `Read Message History`
     - `Send Messages`
     - `Use Slash Commands`
     - `Create Private Threads`

### 3. Развёртывание бота

```bash
# Клонирование репозитория
git clone <repository-url>
cd discord-market-bot

# Установка зависимостей
npm install

# Настройка окружения
cp env.example .env
nano .env
```

**Настройка .env:**
```env
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_guild_id_here
MARKET_CHANNEL_ID=your_market_channel_id_here
AUCTIONEER_ROLE_ID=your_auctioneer_role_id_here
DATABASE_URL="file:./data/market.db"
DEAL_TIMEOUT_HOURS=12
MAX_LISTINGS_PER_USER=10
MAX_ACTIVE_DEALS_PER_USER=5
LOG_LEVEL=info
```

```bash
# Генерация Prisma клиента
npm run db:generate

# Запуск миграций
npm run db:migrate

# Запуск бота
npm start
```

## 🔧 Настройка каналов и ролей

### 1. Создание канала рынка

1. Создайте текстовый канал (например, `#market`)
2. Скопируйте ID канала (включите режим разработчика в Discord)
3. Добавьте ID в `MARKET_CHANNEL_ID`

### 2. Создание роли аукционера

1. Создайте роль "Аукционер" (Auctioneer)
2. Скопируйте ID роли
3. Добавьте ID в `AUCTIONEER_ROLE_ID`
4. Выдайте роль нужным пользователям

### 3. Настройка прав бота

Убедитесь, что бот имеет права:
- Читать сообщения в канале рынка
- Отправлять сообщения
- Использовать слэш-команды
- Управлять ветками
- Создавать приватные ветки

## 🐳 Docker развёртывание

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Генерация Prisma клиента
RUN npm run db:generate

# Создание директории для данных
RUN mkdir -p data

# Создание пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001
RUN chown -R bot:nodejs /app
USER bot

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  discord-bot:
    build: .
    container_name: discord-market-bot
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Запуск с Docker
```bash
# Сборка и запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## 🔄 Автоматизация и мониторинг

### 1. Systemd сервис

Создайте файл `/etc/systemd/system/discord-market-bot.service`:

```ini
[Unit]
Description=Discord Market Bot
After=network.target

[Service]
Type=simple
User=bot
WorkingDirectory=/opt/discord-market-bot
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Логирование
StandardOutput=journal
StandardError=journal
SyslogIdentifier=discord-market-bot

# Безопасность
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/discord-market-bot/data /opt/discord-market-bot/logs

[Install]
WantedBy=multi-user.target
```

```bash
# Активация сервиса
sudo systemctl daemon-reload
sudo systemctl enable discord-market-bot
sudo systemctl start discord-market-bot

# Проверка статуса
sudo systemctl status discord-market-bot
```

### 2. Мониторинг логов

```bash
# Просмотр логов в реальном времени
sudo journalctl -u discord-market-bot -f

# Просмотр последних логов
sudo journalctl -u discord-market-bot --since "1 hour ago"
```

### 3. Автоматическое обновление

Создайте скрипт `update-bot.sh`:

```bash
#!/bin/bash
cd /opt/discord-market-bot

# Остановка сервиса
sudo systemctl stop discord-market-bot

# Создание бэкапа
cp -r data data.backup.$(date +%Y%m%d_%H%M%S)

# Обновление кода
git pull origin main

# Установка зависимостей
npm install

# Запуск миграций
npm run db:migrate

# Запуск сервиса
sudo systemctl start discord-market-bot

echo "Bot updated successfully"
```

## 🔒 Безопасность

### 1. Права файлов

```bash
# Создание пользователя для бота
sudo useradd -r -s /bin/false bot

# Настройка прав
sudo chown -R bot:bot /opt/discord-market-bot
sudo chmod 750 /opt/discord-market-bot
sudo chmod 640 /opt/discord-market-bot/.env
```

### 2. Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### 3. SSL/TLS (для веб-панели в будущем)

```bash
# Установка Certbot
sudo apt install certbot

# Получение сертификата
sudo certbot certonly --standalone -d your-domain.com
```

## 📊 Мониторинг производительности

### 1. Системные метрики

```bash
# Использование ресурсов
htop
iotop

# Использование диска
df -h
du -sh /opt/discord-market-bot/data
```

### 2. Логи приложения

```bash
# Размер логов
du -sh logs/

# Поиск ошибок
grep -i error logs/error.log
grep -i "rate limit" logs/combined.log
```

### 3. База данных

```bash
# Размер базы данных
ls -lh data/market.db

# Проверка целостности
sqlite3 data/market.db "PRAGMA integrity_check;"
```

## 🔧 Обслуживание

### 1. Ежедневные задачи

```bash
# Очистка старых логов
find logs/ -name "*.log" -mtime +30 -delete

# Резервное копирование базы данных
cp data/market.db backups/market_$(date +%Y%m%d).db
```

### 2. Еженедельные задачи

```bash
# Обновление зависимостей
npm audit
npm update

# Проверка целостности БД
sqlite3 data/market.db "VACUUM;"
```

### 3. Ежемесячные задачи

```bash
# Полная очистка логов
rm -rf logs/*.log

# Архивация старых бэкапов
tar -czf backups/monthly_$(date +%Y%m).tar.gz backups/
```

## 🚨 Устранение неполадок

### Частые проблемы

1. **Бот не отвечает на команды**
   - Проверьте токен бота
   - Убедитесь, что бот онлайн
   - Проверьте права бота

2. **Ошибки базы данных**
   - Проверьте права на файл БД
   - Запустите миграции: `npm run db:migrate`
   - Проверьте целостность: `sqlite3 data/market.db "PRAGMA integrity_check;"`

3. **Высокое использование памяти**
   - Перезапустите бота
   - Проверьте логи на утечки памяти
   - Увеличьте лимиты в systemd

4. **Rate limiting**
   - Проверьте количество пользователей
   - Увеличьте лимиты в конфигурации
   - Оптимизируйте запросы к БД

### Полезные команды

```bash
# Проверка статуса
sudo systemctl status discord-market-bot

# Перезапуск
sudo systemctl restart discord-market-bot

# Просмотр логов
sudo journalctl -u discord-market-bot --since "10 minutes ago"

# Проверка портов
netstat -tlnp | grep node
```
