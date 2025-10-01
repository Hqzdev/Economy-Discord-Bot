const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Auction = require('../models/Auction');
const Deal = require('../models/Deal');
const Item = require('../models/Item');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction-end')
        .setDescription('Завершить аукцион досрочно')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID аукциона')
                .setRequired(true)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            const auctionId = interaction.options.getInteger('id');

            // Get auction
            const auction = await Auction.findById(auctionId);
            
            if (!auction) {
                await interaction.reply({ 
                    content: '❌ Аукцион не найден.', 
                    ephemeral: true 
                });
                return;
            }

            // Check if auction is already ended
            if (auction.status === 'ended' || auction.status === 'canceled') {
                await interaction.reply({ 
                    content: `❌ Аукцион уже завершён (статус: ${auction.status}).`, 
                    ephemeral: true 
                });
                return;
            }

            // Check permissions - only creator or admin can end
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const isCreator = auction.createdBy === interaction.user.id;

            if (!isAdmin && !isCreator) {
                await interaction.reply({ 
                    content: '❌ У вас нет прав для завершения этого аукциона.', 
                    ephemeral: true 
                });
                return;
            }

            // End auction
            await auction.endAuction();
            
            const highestBid = await auction.getHighestBid();
            
            const embed = new EmbedBuilder()
                .setTitle('🏁 Аукцион завершён')
                .setDescription(`Аукцион #${auctionId} был завершён досрочно.`)
                .setColor(0x303135)
                .setTimestamp();

            if (highestBid) {
                // Create deal for winner
                const item = await Item.findById(auction.itemId);
                if (item && item.status === 'active') {
                    const deal = await Deal.create(
                        auction.itemId,
                        highestBid.bidder_id,
                        item.sellerId,
                        highestBid.amount,
                        1
                    );
                    
                    // Update item status
                    await item.updateStatus('sold');
                    
                    embed.addFields(
                        { name: '🏆 Победитель', value: `<@${highestBid.bidder_id}>`, inline: true },
                        { name: '💰 Финальная цена', value: `${highestBid.amount} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                        { name: '🤝 Сделка', value: `#${deal.id}`, inline: true }
                    );
                }
            } else {
                embed.addFields({
                    name: '📭 Результат',
                    value: 'Аукцион завершён без ставок',
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error ending auction:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при завершении аукциона.', 
                ephemeral: true 
            });
        }
    }
};

