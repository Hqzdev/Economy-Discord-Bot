const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('[ADMIN] Добавить деньги пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Сумма')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Куда добавить')
                .setRequired(true)
                .addChoices(
                    { name: 'Кэш', value: 'cash' },
                    { name: 'Банк', value: 'bank' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({ 
                    content: '❌ У вас нет прав для использования этой команды.', 
                    flags: 64 
                });
                return;
            }

            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const type = interaction.options.getString('type');

            // Get or create target user
            let user = await User.findByDiscordId(targetUser.id);
            if (!user) {
                user = await User.create(targetUser.id, targetUser.username, []);
            }

            // Add money
            if (type === 'cash') {
                await user.addCash(amount);
            } else {
                await user.addBank(amount);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Деньги добавлены')
                .setDescription(`Пользователю ${targetUser} добавлено **${amount}** ${process.env.CURRENCY_NAME || 'золото'} в ${type === 'cash' ? 'кэш' : 'банк'}.`)
                .addFields(
                    { name: '💰 Кэш', value: `${user.cash} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true },
                    { name: '🏦 Банк', value: `${user.bank} ${process.env.CURRENCY_NAME || 'золото'}`, inline: true }
                )
                .setColor(0x303135)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error executing add command:', error);
            await interaction.reply({ 
                content: '❌ Ошибка при добавлении средств.', 
                flags: 64 
            });
        }
    }
};

