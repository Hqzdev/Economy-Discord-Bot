const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Снять деньги с банка')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Сумма для снятия')
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

            // Check if user has enough money in bank
            if (user.bank < amount) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Недостаточно средств')
                    .setDescription(`У вас на счету только **${user.bank}** ${process.env.CURRENCY_NAME || 'золото'}.`)
                    .setColor(0x303135)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            // Withdraw from bank
            await user.withdrawFromBank(amount);

            const embed = new EmbedBuilder()
                .setTitle('💸 Снятие выполнено!')
                .setDescription(`Вы сняли **${amount}** ${process.env.CURRENCY_NAME || 'золото'} с банка.`)
                .addFields(
                    { name: '💰 Ваш кэш', value: `${user.cash} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🏦 Ваш банк', value: `${user.bank} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                )
                .setColor(0x303135)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing withdraw command:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при снятии средств.', 
                ephemeral: true 
            });
        }
    }
};

