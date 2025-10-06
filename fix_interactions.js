const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src/index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import after logger
content = content.replace(
    "const logger = require('./utils/logger');",
    "const logger = require('./utils/logger');\nconst { safeReply } = require('./utils/interactionHelper');"
);

// 2. Replace interaction.reply with safeReply in catch blocks for errors
// Specifically in the handleSellItem function
content = content.replace(
    /} catch \(error\) \{\s*logger\.error\('Error creating item:', error\);\s*await interaction\.reply\(\{ content: '❌ Ошибка при создании лота\.', ephemeral: true \}\);/g,
    "} catch (error) {\n        logger.error('Error creating item:', error);\n        await safeReply(interaction, { content: '❌ Ошибка при создании лота.', ephemeral: true });"
);

// 3. Replace in handleCommand
content = content.replace(
    /} catch \(error\) \{\s*logger\.error\(`Error executing command \$\{interaction\.commandName\}:`, error\);\s*await interaction\.reply\(\{ content: 'Произошла ошибка при выполнении команды\.', ephemeral: true \}\);/g,
    "} catch (error) {\n        logger.error(`Error executing command ${interaction.commandName}:`, error);\n        await safeReply(interaction, { content: 'Произошла ошибка при выполнении команды.', ephemeral: true });"
);

// 4. Replace in main interaction handler
content = content.replace(
    /} catch \(error\) \{\s*logger\.error\('Error handling interaction:', error\);\s*if \(interaction\.replied \|\| interaction\.deferred\) \{\s*await interaction\.followUp\(\{ content: 'Произошла ошибка при обработке запроса\.', ephemeral: true \}\);\s*\} else \{\s*await interaction\.reply\(\{ content: 'Произошла ошибка при обработке запроса\.', ephemeral: true \}\);\s*\}/g,
    "} catch (error) {\n        logger.error('Error handling interaction:', error);\n        await safeReply(interaction, { content: 'Произошла ошибка при обработке запроса.', ephemeral: true });"
);

// 5. Fix other critical reply error handlers
content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при загрузке товаров\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при загрузке товаров.', ephemeral: true });"
);

content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при создании сделки\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при создании сделки.', ephemeral: true });"
);

content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при обработке действия\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при обработке действия.', ephemeral: true });"
);

content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при загрузке аукционов\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при загрузке аукционов.', ephemeral: true });"
);

content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при загрузке сделок\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при загрузке сделок.', ephemeral: true });"
);

content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при обработке кнопки\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при обработке кнопки.', ephemeral: true });"
);

content = content.replace(
    /await interaction\.reply\(\{ content: '❌ Ошибка при обработке выбора\.', ephemeral: true \}\);/g,
    "await safeReply(interaction, { content: '❌ Ошибка при обработке выбора.', ephemeral: true });"
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully patched src/index.js');
console.log('🔧 Replaced interaction.reply with safeReply in error handlers');

