const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Поработать и заработать деньги'),
    
    async execute(interaction) {
        try {
            // Get or create user
            let user = await User.findByDiscordId(interaction.user.id);
            if (!user) {
                user = await User.create(interaction.user.id, interaction.user.username, []);
            }

            // Random earnings between 50 and 200
            const earnings = Math.floor(Math.random() * 151) + 50;
            
            // Add cash to user
            await user.addCash(earnings);

            const workTypes = [
                'поработали программистом',
                'продали крипту',
                'сделали заказ на фрилансе',
                'выиграли в лотерею',
                'нашли клад',
                'продали старые вещи',
                'помогли бабушке перейти дорогу (она дала вам денег)',
                'выступили на концерте',
                'сняли вирусное видео'
            ];

            const randomWork = workTypes[Math.floor(Math.random() * workTypes.length)];

            const embed = new EmbedBuilder()
                .setTitle('💼 Работа выполнена!')
                .setDescription(`Вы ${randomWork} и заработали **${earnings}** ${process.env.CURRENCY_NAME || 'золото'}!`)
                .addFields(
                    { name: '💰 Ваш кэш', value: `${user.cash} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🏦 Ваш банк', value: `${user.bank} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                )
                .setColor(0x303135)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing work command:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при выполнении работы.', 
                ephemeral: true 
            });
        }
    }
};

