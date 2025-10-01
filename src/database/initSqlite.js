const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/economy_bot.db');
const schemaPath = path.join(__dirname, 'sqlite-schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database and run schema
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split schema into individual statements
const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

// Execute each statement
db.serialize(() => {
    statements.forEach((statement, index) => {
        db.run(statement + ';', (err) => {
            if (err) {
                console.error(`❌ Error executing statement ${index + 1}:`, err);
                console.error('Statement:', statement);
            } else {
                console.log(`✅ Executed statement ${index + 1}`);
            }
        });
    });
});

db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err);
        process.exit(1);
    }
    console.log('✅ Database initialized successfully!');
    console.log('🎉 You can now start the bot');
});

