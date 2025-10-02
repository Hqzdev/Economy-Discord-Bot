const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../models/User');
const Deal = require('../models/Deal');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Просмотреть профиль пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь для просмотра профиля')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const isOwnProfile = targetUser.id === interaction.user.id;

        try {
            // Get user from database
            let user = await User.findByDiscordId(targetUser.id);
            if (!user) {
                user = await User.create(targetUser.id, targetUser.username, []);
            }

            // Get deal statistics
            const dealStats = await getDealStats(targetUser.id);

            const totalBalance = user.cash + user.bank;

            const embed = new EmbedBuilder()
                .setTitle(`👤 Профиль ${targetUser.username}`)
                .setDescription(isOwnProfile ? 'Ваш торговый профиль' : `Профиль пользователя ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor(0x303135)
                .setTimestamp()
                .addFields(
                    { name: '💰 Кэш', value: `${user.cash} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🏦 Банк', value: `${user.bank} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '💎 Всего', value: `${totalBalance} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🤝 Активных сделок', value: dealStats.active.toString(), inline: true },
                    { name: '✅ Завершённых', value: dealStats.completed.toString(), inline: true },
                    { name: '❌ Отменённых', value: dealStats.canceled.toString(), inline: true }
                );

            // Кнопки для управления профилем
            const buttons = [];
            
            if (isOwnProfile) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('profile_settings')
                        .setLabel('⚙️ Настройки')
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`profile_deals_${targetUser.id}`)
                    .setLabel('📋 Сделки')
                    .setStyle(ButtonStyle.Secondary)
            );

            const row = new ActionRowBuilder().addComponents(buttons);

            await interaction.reply({ 
                embeds: [embed], 
                components: buttons.length > 0 ? [row] : [] 
            });

        } catch (error) {
            console.error('Error showing profile:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при загрузке профиля.', 
                flags: 64 
            });
        }
    }
};

// Helper function to get deal statistics
async function getDealStats(userId) {
    try {
        const query = `
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled
            FROM deals
            WHERE buyer_id = $1 OR seller_id = $1
        `;
        const { dbAdapter } = require('../database/dbAdapter');
        const result = await dbAdapter.query(query, [userId]);
        
        if (result.rows && result.rows.length > 0) {
            return {
                active: parseInt(result.rows[0].active) || 0,
                completed: parseInt(result.rows[0].completed) || 0,
                canceled: parseInt(result.rows[0].canceled) || 0
            };
        }
        
        return { active: 0, completed: 0, canceled: 0 };
    } catch (error) {
        console.error('Error getting deal stats:', error);
        return { active: 0, completed: 0, canceled: 0 };
    }
}
