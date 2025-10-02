const logger = require('../utils/logger');

class ChannelCleanupService {
    constructor(client) {
        this.client = client;
        this.channelTimers = new Map(); // channelId -> timeout
        this.INACTIVITY_TIMEOUT = 60000; // 1 минута в миллисекундах
    }

    /**
     * Start inactivity timer for a channel
     * @param {string} channelId - Discord channel ID
     */
    startInactivityTimer(channelId) {
        // Clear existing timer if any
        this.clearTimer(channelId);

        const timer = setTimeout(async () => {
            try {
                await this.deleteChannel(channelId);
                logger.info(`Channel ${channelId} deleted due to inactivity`);
            } catch (error) {
                logger.error(`Error deleting inactive channel ${channelId}:`, error);
            }
        }, this.INACTIVITY_TIMEOUT);

        this.channelTimers.set(channelId, timer);
        logger.info(`Started inactivity timer for channel ${channelId}`);
    }

    /**
     * Reset inactivity timer for a channel (when there's activity)
     * @param {string} channelId - Discord channel ID
     */
    resetTimer(channelId) {
        if (this.channelTimers.has(channelId)) {
            this.clearTimer(channelId);
            this.startInactivityTimer(channelId);
            logger.info(`Reset inactivity timer for channel ${channelId}`);
        }
    }

    /**
     * Clear timer for a channel
     * @param {string} channelId - Discord channel ID
     */
    clearTimer(channelId) {
        if (this.channelTimers.has(channelId)) {
            clearTimeout(this.channelTimers.get(channelId));
            this.channelTimers.delete(channelId);
        }
    }

    /**
     * Delete a channel immediately
     * @param {string} channelId - Discord channel ID
     */
    async deleteChannel(channelId) {
        try {
            this.clearTimer(channelId);
            
            const channel = await this.client.channels.fetch(channelId);
            if (channel) {
                await channel.delete('Сделка завершена или неактивность');
                logger.info(`Channel ${channelId} deleted successfully`);
            }
        } catch (error) {
            logger.error(`Error deleting channel ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * Schedule deletion with a delay (e.g., after deal completion)
     * @param {string} channelId - Discord channel ID
     * @param {number} delayMs - Delay in milliseconds before deletion
     */
    scheduleDelete(channelId, delayMs = 5000) {
        this.clearTimer(channelId);

        const timer = setTimeout(async () => {
            try {
                await this.deleteChannel(channelId);
                logger.info(`Channel ${channelId} deleted after scheduled delay`);
            } catch (error) {
                logger.error(`Error in scheduled deletion of channel ${channelId}:`, error);
            }
        }, delayMs);

        this.channelTimers.set(channelId, timer);
        logger.info(`Scheduled deletion for channel ${channelId} in ${delayMs}ms`);
    }

    /**
     * Clean up all timers
     */
    cleanup() {
        this.channelTimers.forEach((timer, channelId) => {
            clearTimeout(timer);
        });
        this.channelTimers.clear();
        logger.info('All channel timers cleared');
    }
}

module.exports = ChannelCleanupService;

