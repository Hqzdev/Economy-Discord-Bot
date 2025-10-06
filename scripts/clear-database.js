#!/usr/bin/env node

/**
 * Скрипт для полной очистки базы данных от всех аукционов и товаров
 * 
 * ВНИМАНИЕ: Этот скрипт удаляет ВСЕ данные из базы!
 * Используйте только для полной очистки системы.
 * 
 * Запуск: node scripts/clear-database.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к файлу базы данных
const dbPath = path.join(__dirname, '../data/market.json');

// Создаем интерфейс для чтения ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function clearDatabase() {
  console.log('🗑️  СКРИПТ ОЧИСТКИ БАЗЫ ДАННЫХ');
  console.log('================================');
  console.log('');
  
  // Проверяем существование файла базы данных
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Файл базы данных не найден:', dbPath);
    console.log('💡 Убедитесь, что бот был запущен хотя бы один раз');
    rl.close();
    return;
  }

  // Читаем текущие данные
  let currentData;
  try {
    const fileContent = fs.readFileSync(dbPath, 'utf8');
    currentData = JSON.parse(fileContent);
  } catch (error) {
    console.log('❌ Ошибка при чтении базы данных:', error.message);
    rl.close();
    return;
  }

  // Показываем статистику
  console.log('📊 ТЕКУЩАЯ СТАТИСТИКА:');
  console.log('----------------------');
  console.log(`👥 Пользователи: ${currentData.users?.length || 0}`);
  console.log(`📦 Товары на складах: ${currentData.stocks?.length || 0}`);
  console.log(`🛒 Активные лоты: ${currentData.listings?.length || 0}`);
  console.log(`🤝 Сделки: ${currentData.deals?.length || 0}`);
  console.log(`🔨 Аукционы: ${currentData.auctions?.length || 0}`);
  console.log(`💰 Ставки: ${currentData.bids?.length || 0}`);
  console.log(`📋 Логи аудита: ${currentData.auditLog?.length || 0}`);
  console.log(`💬 Постоянные сообщения: ${currentData.persistentMessages?.length || 0}`);
  console.log('');

  // Предупреждение
  console.log('⚠️  ВНИМАНИЕ!');
  console.log('=============');
  console.log('Этот скрипт удалит ВСЕ данные из базы:');
  console.log('• Все аукционы и ставки');
  console.log('• Все товары и лоты');
  console.log('• Все сделки');
  console.log('• Все склады пользователей');
  console.log('• Все логи аудита');
  console.log('• Все постоянные сообщения');
  console.log('');
  console.log('❌ НЕ БУДУТ УДАЛЕНЫ:');
  console.log('• Пользователи (останутся в системе)');
  console.log('');

  // Запрашиваем подтверждение
  const confirm1 = await askQuestion('❓ Вы уверены, что хотите продолжить? (yes/no): ');
  
  if (confirm1.toLowerCase() !== 'yes') {
    console.log('✅ Операция отменена');
    rl.close();
    return;
  }

  console.log('');
  const confirm2 = await askQuestion('❓ Введите "DELETE ALL" для подтверждения: ');
  
  if (confirm2 !== 'DELETE ALL') {
    console.log('✅ Операция отменена');
    rl.close();
    return;
  }

  console.log('');
  console.log('🔄 Начинаем очистку...');

  // Создаем резервную копию
  const backupPath = path.join(__dirname, '../backups', `backup-${Date.now()}.json`);
  const backupDir = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 Резервная копия создана: ${backupPath}`);
  } catch (error) {
    console.log('⚠️  Не удалось создать резервную копию:', error.message);
  }

  // Очищаем данные
  const clearedData = {
    users: currentData.users || [], // Пользователей оставляем
    stocks: [], // Очищаем склады
    listings: [], // Очищаем лоты
    deals: [], // Очищаем сделки
    auctions: [], // Очищаем аукционы
    bids: [], // Очищаем ставки
    auditLog: [], // Очищаем логи
    persistentMessages: [] // Очищаем постоянные сообщения
  };

  // Сохраняем очищенные данные
  try {
    fs.writeFileSync(dbPath, JSON.stringify(clearedData, null, 2));
    console.log('✅ База данных успешно очищена!');
  } catch (error) {
    console.log('❌ Ошибка при сохранении очищенной базы:', error.message);
    rl.close();
    return;
  }

  // Показываем результат
  console.log('');
  console.log('📊 РЕЗУЛЬТАТ ОЧИСТКИ:');
  console.log('---------------------');
  console.log(`👥 Пользователи: ${clearedData.users.length} (сохранены)`);
  console.log(`📦 Товары на складах: ${clearedData.stocks.length} (удалены)`);
  console.log(`🛒 Активные лоты: ${clearedData.listings.length} (удалены)`);
  console.log(`🤝 Сделки: ${clearedData.deals.length} (удалены)`);
  console.log(`🔨 Аукционы: ${clearedData.auctions.length} (удалены)`);
  console.log(`💰 Ставки: ${clearedData.bids.length} (удалены)`);
  console.log(`📋 Логи аудита: ${clearedData.auditLog.length} (удалены)`);
  console.log(`💬 Постоянные сообщения: ${clearedData.persistentMessages.length} (удалены)`);
  console.log('');

  console.log('🎉 Очистка завершена успешно!');
  console.log('💡 Перезапустите бота для применения изменений');
  console.log('');

  rl.close();
}

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Критическая ошибка:', error.message);
  rl.close();
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Необработанная ошибка:', error.message);
  rl.close();
  process.exit(1);
});

// Запускаем скрипт
clearDatabase().catch((error) => {
  console.error('❌ Ошибка выполнения скрипта:', error.message);
  rl.close();
  process.exit(1);
});
