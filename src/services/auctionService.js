const Auction = require('../models/Auction');
const Item = require('../models/Item');
const Deal = require('../models/Deal');
const logger = require('../utils/logger');

class AuctionService {
    static async processEndedAuctions() {
        try {
            const endedAuctions = await Auction.findEnded();
            
            for (const auctionData of endedAuctions) {
                const auction = auctionData.auction;
                
                // End the auction
                await auction.endAuction();
                
                const highestBid = await auction.getHighestBid();
                
                if (highestBid) {
                    // Create a deal for the winner
                    const item = await Item.findById(auction.itemId);
                    if (item && item.status === 'active') {
                        await Deal.create(
                            auction.itemId,
                            highestBid.bidder_id,
                            item.sellerId,
                            highestBid.amount,
                            1
                        );
                        
                        // Update item status
                        await item.updateStatus('sold');
                        
                        logger.info(`Auction ${auction.id} ended. Winner: ${highestBid.bidder_id}, Price: ${highestBid.amount}`);
                    }
                } else {
                    // No bids, mark auction as ended without winner
                    await auction.updateStatus('ended');
                    logger.info(`Auction ${auction.id} ended without bids`);
                }
            }
            
            return endedAuctions.length;
        } catch (error) {
            logger.error('Error processing ended auctions:', error);
            throw error;
        }
    }
    
    static async startAuctionProcessor() {
        // Process ended auctions every minute
        setInterval(async () => {
            try {
                const processed = await this.processEndedAuctions();
                if (processed > 0) {
                    logger.info(`Processed ${processed} ended auctions`);
                }
            } catch (error) {
                logger.error('Error in auction processor:', error);
            }
        }, 60000); // 1 minute
    }
}

module.exports = AuctionService;
