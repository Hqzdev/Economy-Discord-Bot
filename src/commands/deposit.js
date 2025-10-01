const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Положить деньги в банк')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Сумма для внесения')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction) {
        try {
            const amount = interaction.options.getInteger('amount');

            // Get user
            let user = await User.findByDiscordId(interaction.user.id);
            if (!user) {
                user = await User.create(interaction.user.id, interaction.user.username, []);
            }

            // Check if user has enough cash
            if (user.cash < amount) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Недостаточно средств')
                    .setDescription(`У вас в кармане только **${user.cash}** ${process.env.CURRENCY_NAME || 'золото'}.`)
                    .setColor(0x303135)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            // Transfer to bank
            await user.transferToBank(amount);

            const embed = new EmbedBuilder()
                .setTitle('🏦 Депозит выполнен!')
                .setDescription(`Вы положили **${amount}** ${process.env.CURRENCY_NAME || 'золото'} в банк.`)
                .addFields(
                    { name: '💰 Ваш кэш', value: `${user.cash} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🏦 Ваш банк', value: `${user.bank} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                )
                .setColor(0x303135)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing deposit command:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при внесении средств.', 
                ephemeral: true 
            });
        }
    }
};

