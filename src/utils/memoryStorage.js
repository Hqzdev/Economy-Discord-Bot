// Система хранения данных в памяти бота
class MemoryStorage {
    constructor() {
        // Хранилище активных лотов
        this.activeItems = new Map();
        
        // Хранилище сделок
        this.deals = new Map();
        
        // Хранилище аукционов
        this.auctions = new Map();
        
        // Счетчик ID для генерации уникальных ID
        this.itemIdCounter = 1;
        this.dealIdCounter = 1;
        this.auctionIdCounter = 1;
    }

    // === УПРАВЛЕНИЕ ЛОТАМИ ===
    
    // Создать новый лот
    createItem(sellerId, title, description, price, quantity, category = null) {
        const item = {
            id: this.itemIdCounter++,
            sellerId,
            title,
            description,
            price,
            quantity,
            category,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.activeItems.set(item.id, item);
        return item;
    }

    // Получить все активные лоты
    getActiveItems() {
        return Array.from(this.activeItems.values()).filter(item => item.status === 'active');
    }

    // Получить лот по ID
    getItemById(id) {
        return this.activeItems.get(parseInt(id));
    }

    // Обновить лот
    updateItem(id, updates) {
        const item = this.activeItems.get(parseInt(id));
        if (item) {
            Object.assign(item, updates, { updatedAt: new Date() });
            return item;
        }
        return null;
    }

    // Удалить лот
    removeItem(id) {
        return this.activeItems.delete(parseInt(id));
    }

    // Сортировка лотов по названию
    getSortedItems(sortBy = 'title', order = 'asc') {
        const items = this.getActiveItems();
        return items.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'price':
                    comparison = a.price - b.price;
                    break;
                case 'createdAt':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
                default:
                    comparison = a.title.localeCompare(b.title);
            }
            
            return order === 'desc' ? -comparison : comparison;
        });
    }

    // Поиск лотов по названию
    searchItems(query) {
        const items = this.getActiveItems();
        const lowercaseQuery = query.toLowerCase();
        
        return items.filter(item => 
            item.title.toLowerCase().includes(lowercaseQuery) ||
            (item.description && item.description.toLowerCase().includes(lowercaseQuery))
        );
    }

    // === УПРАВЛЕНИЕ СДЕЛКАМИ ===
    
    // Создать сделку
    createDeal(itemId, buyerId, sellerId, channelId) {
        const item = this.getItemById(itemId);
        if (!item) return null;
        
        const deal = {
            id: this.dealIdCounter++,
            itemId,
            buyerId,
            sellerId,
            channelId,
            item: { ...item },
            status: 'pending',
            price: item.price,
            quantity: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        this.deals.set(deal.id, deal);
        return deal;
    }

    // Получить сделки пользователя
    getUserDeals(userId) {
        return Array.from(this.deals.values()).filter(deal => 
            deal.buyerId === userId || deal.sellerId === userId
        );
    }

    // Получить активные сделки пользователя
    getActiveUserDeals(userId) {
        return this.getUserDeals(userId).filter(deal => 
            deal.status === 'pending' || deal.status === 'active'
        );
    }

    // Получить завершенные сделки пользователя
    getCompletedUserDeals(userId) {
        return this.getUserDeals(userId).filter(deal => 
            deal.status === 'completed' || deal.status === 'canceled'
        );
    }

    // Обновить сделку
    updateDeal(id, updates) {
        const deal = this.deals.get(parseInt(id));
        if (deal) {
            Object.assign(deal, updates, { updatedAt: new Date() });
            return deal;
        }
        return null;
    }

    // === УПРАВЛЕНИЕ АУКЦИОНАМИ ===
    
    // Создать аукцион (только для специальных ролей)
    createAuction(createdBy, item, minBid, durationHours = 24) {
        const auction = {
            id: this.auctionIdCounter++,
            createdBy,
            item,
            minBid,
            currentBid: minBid,
            currentBidder: null,
            durationHours,
            startTime: new Date(),
            endTime: new Date(Date.now() + durationHours * 60 * 60 * 1000),
            status: 'active',
            bids: [],
            createdAt: new Date()
        };
        
        this.auctions.set(auction.id, auction);
        return auction;
    }

    // Получить активные аукционы
    getActiveAuctions() {
        return Array.from(this.auctions.values()).filter(auction => 
            auction.status === 'active' && new Date() < auction.endTime
        );
    }

    // Сделать ставку
    placeBid(auctionId, bidderId, amount) {
        const auction = this.auctions.get(parseInt(auctionId));
        if (!auction || auction.status !== 'active' || new Date() >= auction.endTime) {
            return null;
        }
        
        if (amount <= auction.currentBid) {
            return null; // Ставка должна быть выше текущей
        }
        
        auction.currentBid = amount;
        auction.currentBidder = bidderId;
        auction.bids.push({
            bidderId,
            amount,
            timestamp: new Date()
        });
        
        return auction;
    }

    // === СТАТИСТИКА ===
    
    // Получить статистику
    getStats() {
        const activeItems = this.getActiveItems().length;
        const activeDeals = Array.from(this.deals.values()).filter(deal => 
            deal.status === 'pending' || deal.status === 'active'
        ).length;
        const activeAuctions = this.getActiveAuctions().length;
        const completedDeals = Array.from(this.deals.values()).filter(deal => 
            deal.status === 'completed'
        ).length;
        const canceledDeals = Array.from(this.deals.values()).filter(deal => 
            deal.status === 'canceled'
        ).length;
        
        const totalVolume = Array.from(this.deals.values())
            .filter(deal => deal.status === 'completed')
            .reduce((sum, deal) => sum + deal.price, 0);
        
        return {
            active_items: activeItems,
            active_deals: activeDeals,
            active_auctions: activeAuctions,
            completed_deals: completedDeals,
            canceled_deals: canceledDeals,
            total_volume: totalVolume
        };
    }

    // Очистить старые данные (для очистки завершенных сделок старше определенного времени)
    cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 дней по умолчанию
        const cutoffTime = new Date(Date.now() - maxAge);
        
        // Очистка старых завершенных сделок
        for (const [id, deal] of this.deals.entries()) {
            if ((deal.status === 'completed' || deal.status === 'canceled') && 
                deal.updatedAt < cutoffTime) {
                this.deals.delete(id);
            }
        }
        
        // Очистка завершенных аукционов
        for (const [id, auction] of this.auctions.entries()) {
            if (auction.status === 'completed' && auction.createdAt < cutoffTime) {
                this.auctions.delete(id);
            }
        }
    }
}

// Экспортируем единственный экземпляр
const memoryStorage = new MemoryStorage();

module.exports = memoryStorage;
