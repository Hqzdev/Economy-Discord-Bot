const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src/index.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the button handler - wrap showModal in try-catch and mark interaction
const oldButtonHandler = `    try {
        switch (buttonId) {
            case 'main_menu':
            case 'back_to_main':
                await showMainMenu(interaction);
                break;
            case 'sell_item':
                await showSellModal(interaction);
                break;`;

const newButtonHandler = `    let modalShown = false;
    try {
        switch (buttonId) {
            case 'main_menu':
            case 'back_to_main':
                await showMainMenu(interaction);
                break;
            case 'sell_item':
                await showSellModal(interaction);
                modalShown = true; // Modal shown, don't reply in catch
                break;`;

content = content.replace(oldButtonHandler, newButtonHandler);

// Update the catch block to check if modal was shown
const oldCatch = `    } catch (error) {
        logger.error('Error handling button interaction:', error);
        await safeReply(interaction, { content: '❌ Ошибка при обработке кнопки.', ephemeral: true });
    }
}`;

const newCatch = `    } catch (error) {
        logger.error('Error handling button interaction:', error);
        // Don't reply if modal was shown (it's already acknowledged)
        if (!modalShown) {
            await safeReply(interaction, { content: '❌ Ошибка при обработке кнопки.', ephemeral: true });
        }
    }
}`;

content = content.replace(oldCatch, newCatch);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully patched modal handling in src/index.js');
console.log('🔧 Fixed showModal() acknowledgment issue');

