const { EmbedBuilder } = require('discord.js');

class EmbedUtils {
    static createMainMenuEmbed() {
        return new EmbedBuilder()
            .setTitle('🏪 Рынок ролевого проекта')
            .setDescription('Добро пожаловать на рынок! Выберите действие:')
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ text: 'Используйте кнопки ниже для навигации' });
    }
    
    static createItemEmbed(item, sellerName = null) {
        const embed = new EmbedBuilder()
            .setTitle(`📦 ${item.title}`)
            .setColor(0x0099ff)
            .setTimestamp()
            .addFields(
                { name: '💰 Цена', value: `${item.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: item.quantity.toString(), inline: true },
                { name: '👤 Продавец', value: sellerName || `<@${item.sellerId}>`, inline: true }
            );
            
        if (item.description) {
            embed.setDescription(item.description);
        }
        
        if (item.category) {
            embed.addFields({ name: '🏷️ Категория', value: item.category, inline: true });
        }
        
        if (item.imageUrl) {
            embed.setImage(item.imageUrl);
        }
        
        return embed;
    }
    
    static createDealEmbed(deal, item, sellerName, buyerName) {
        return new EmbedBuilder()
            .setTitle('🤝 Новая сделка')
            .setDescription(`**Товар:** ${item.title}`)
            .setColor(0x0099ff)
            .setTimestamp()
            .addFields(
                { name: '💰 Цена', value: `${deal.price} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📦 Количество', value: deal.quantity.toString(), inline: true },
                { name: '👤 Продавец', value: sellerName || `<@${deal.sellerId}>`, inline: true },
                { name: '🛒 Покупатель', value: buyerName || `<@${deal.buyerId}>`, inline: true },
                { name: '📊 Статус', value: deal.status, inline: true }
            );
    }
    
    static createAuctionEmbed(auction, item, creatorName) {
        const timeRemaining = auction.getTimeRemaining();
        const timeStr = timeRemaining ? 
            `${timeRemaining.days}д ${timeRemaining.hours}ч ${timeRemaining.minutes}м` : 
            'Завершен';
            
        return new EmbedBuilder()
            .setTitle(`🔨 Аукцион: ${item.title}`)
            .setDescription(item.description || '')
            .setColor(0xff9900)
            .setTimestamp()
            .addFields(
                { name: '💰 Минимальная ставка', value: `${auction.minBid} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '📈 Шаг ставки', value: `${auction.step} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                { name: '⏰ Осталось времени', value: timeStr, inline: true },
                { name: '👤 Создатель', value: creatorName || `<@${auction.createdBy}>`, inline: true }
            );
    }
    
    static createStatsEmbed(stats) {
        return new EmbedBuilder()
            .setTitle('📊 Статистика рынка')
            .setColor(0x9932cc)
            .setTimestamp()
            .addFields(
                { name: '📦 Активных лотов', value: stats.active_items?.toString() || '0', inline: true },
                { name: '🤝 Активных сделок', value: stats.active_deals?.toString() || '0', inline: true },
                { name: '🔨 Активных аукционов', value: stats.active_auctions?.toString() || '0', inline: true },
                { name: '✅ Завершенных сделок', value: stats.completed_deals?.toString() || '0', inline: true },
                { name: '❌ Отмененных сделок', value: stats.canceled_deals?.toString() || '0', inline: true },
                { name: '💰 Общий оборот', value: `${stats.total_volume || 0} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
            );
    }
    
    static createErrorEmbed(message) {
        return new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(message)
            .setColor(0xff0000)
            .setTimestamp();
    }
    
    static createSuccessEmbed(message) {
        return new EmbedBuilder()
            .setTitle('✅ Успешно')
            .setDescription(message)
            .setColor(0x00ff00)
            .setTimestamp();
    }
    
    static createWarningEmbed(message) {
        return new EmbedBuilder()
            .setTitle('⚠️ Предупреждение')
            .setDescription(message)
            .setColor(0xffaa00)
            .setTimestamp();
    }
}

module.exports = EmbedUtils;
