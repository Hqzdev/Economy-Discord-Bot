/**
 * Validation utilities for the Economy Discord Bot
 */

class ValidationUtils {
    static validatePrice(price) {
        const numPrice = parseFloat(price);
        return !isNaN(numPrice) && numPrice > 0;
    }
    
    static validateQuantity(quantity) {
        const numQuantity = parseInt(quantity);
        return !isNaN(numQuantity) && numQuantity >= 1 && Number.isInteger(numQuantity);
    }
    
    static validateTitle(title) {
        return typeof title === 'string' && title.trim().length > 0 && title.length <= 200;
    }
    
    static validateDescription(description) {
        return !description || (typeof description === 'string' && description.length <= 1000);
    }
    
    static validateCategory(category) {
        return !category || (typeof category === 'string' && category.length <= 50);
    }
    
    static validateImageUrl(url) {
        if (!url) return true;
        
        try {
            new URL(url);
            return url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        } catch {
            return false;
        }
    }
    
    static validateDiscordId(id) {
        return typeof id === 'string' && /^\d{17,19}$/.test(id);
    }
    
    static validateChannelId(id) {
        return typeof id === 'string' && /^\d{17,19}$/.test(id);
    }
    
    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>]/g, '');
    }
    
    static validateAuctionTime(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();
        
        return start > now && end > start && end > now;
    }
    
    static validateBidAmount(amount, minBid, step) {
        const numAmount = parseFloat(amount);
        return !isNaN(numAmount) && numAmount >= minBid && (numAmount - minBid) % step === 0;
    }
}

module.exports = ValidationUtils;
