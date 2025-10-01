const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
            // Заглушка данных профиля
            const mockProfile = {
                userId: targetUser.id,
                username: targetUser.username,
                avatar: targetUser.displayAvatarURL(),
                joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
                reputation: 85,
                totalSales: 42,
                totalPurchases: 28,
                activeDeals: 3,
                completedDeals: 70,
                canceledDeals: 2,
                totalVolume: 125000,
                favoriteCategory: 'Оружие',
                achievements: ['Надежный торговец', 'Активный покупатель', 'Быстрый продавец']
            };

            const embed = new EmbedBuilder()
                .setTitle(`👤 Профиль ${targetUser.username}`)
                .setDescription(isOwnProfile ? 'Ваш торговый профиль' : `Профиль пользователя ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor(0x303135)
                .setTimestamp()
                .addFields(
                    { name: '📊 Репутация', value: `${mockProfile.reputation}/100`, inline: true },
                    { name: '📅 Дата регистрации', value: `<t:${Math.floor(mockProfile.joinDate.getTime() / 1000)}:d>`, inline: true },
                    { name: '🏆 Любимая категория', value: mockProfile.favoriteCategory, inline: true },
                    { name: '💰 Продано товаров', value: mockProfile.totalSales.toString(), inline: true },
                    { name: '🛒 Куплено товаров', value: mockProfile.totalPurchases.toString(), inline: true },
                    { name: '🤝 Активных сделок', value: mockProfile.activeDeals.toString(), inline: true },
                    { name: '✅ Завершенных сделок', value: mockProfile.completedDeals.toString(), inline: true },
                    { name: '❌ Отмененных сделок', value: mockProfile.canceledDeals.toString(), inline: true },
                    { name: '💎 Общий оборот', value: `${mockProfile.totalVolume.toLocaleString()} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                );

            // Добавляем достижения
            if (mockProfile.achievements.length > 0) {
                embed.addFields({
                    name: '🏆 Достижения',
                    value: mockProfile.achievements.map(achievement => `• ${achievement}`).join('\n'),
                    inline: false
                });
            }

            // Кнопки для управления профилем
            const buttons = [];
            
            if (isOwnProfile) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId('profile_edit')
                        .setLabel('✏️ Редактировать')
                        .setStyle(ButtonStyle.Primary),
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
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`profile_reputation_${targetUser.id}`)
                    .setLabel('⭐ Репутация')
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
                ephemeral: true 
            });
        }
    }
};
