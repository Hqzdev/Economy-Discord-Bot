const fs = require('fs');

// Replace ephemeral with flags in all source files
const files = [
    'src/index.js',
    'src/commands/add.js',
    'src/commands/auction.js',
    'src/commands/auction-end.js',
    'src/commands/balance.js',
    'src/commands/buy.js',
    'src/commands/deals.js',
    'src/commands/deposit.js',
    'src/commands/market.js',
    'src/commands/profile.js',
    'src/commands/sell.js',
    'src/commands/stats.js',
    'src/commands/withdraw.js',
    'src/commands/work.js'
];

let totalReplaced = 0;

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        const before = (content.match(/ephemeral: true/g) || []).length;
        
        // Replace ephemeral: true with flags: 64
        content = content.replace(/ephemeral: true/g, 'flags: 64');
        
        fs.writeFileSync(file, content, 'utf8');
        
        if (before > 0) {
            console.log(`✅ ${file}: replaced ${before} occurrences`);
            totalReplaced += before;
        }
    }
});

console.log(`\n🎉 Total replaced: ${totalReplaced} ephemeral flags`);

