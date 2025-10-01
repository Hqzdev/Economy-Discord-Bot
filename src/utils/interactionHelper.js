/**
 * Safely reply to an interaction, handling already replied/deferred states
 * @param {Interaction} interaction - Discord interaction object
 * @param {Object} options - Reply options (content, embeds, components, etc.)
 * @returns {Promise<void>}
 */
async function safeReply(interaction, options) {
    try {
        if (interaction.replied) {
            // Already replied, use followUp
            return await interaction.followUp(options);
        } else if (interaction.deferred) {
            // Deferred, use editReply
            return await interaction.editReply(options);
        } else {
            // Not yet replied or deferred, use reply
            return await interaction.reply(options);
        }
    } catch (error) {
        console.error('Error in safeReply:', error);
        // Last resort: try followUp if all else fails
        try {
            if (!interaction.replied) {
                return await interaction.reply(options);
            }
        } catch (finalError) {
            console.error('Final error in safeReply:', finalError);
        }
    }
}

/**
 * Safely update an interaction, handling already replied/deferred states
 * @param {Interaction} interaction - Discord interaction object
 * @param {Object} options - Update options (content, embeds, components, etc.)
 * @returns {Promise<void>}
 */
async function safeUpdate(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply(options);
        } else {
            return await interaction.update(options);
        }
    } catch (error) {
        console.error('Error in safeUpdate:', error);
        // Fallback to reply
        return await safeReply(interaction, options);
    }
}

/**
 * Safely defer an interaction reply
 * @param {Interaction} interaction - Discord interaction object
 * @param {Object} options - Defer options (ephemeral, etc.)
 * @returns {Promise<void>}
 */
async function safeDefer(interaction, options = {}) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            return await interaction.deferReply(options);
        }
    } catch (error) {
        console.error('Error in safeDefer:', error);
    }
}

module.exports = {
    safeReply,
    safeUpdate,
    safeDefer
};

