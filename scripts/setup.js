#!/usr/bin/env node

/**
 * Setup script for Discord Market Bot
 * This script helps with initial setup and configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createDirectories() {
  const dirs = ['data', 'logs', 'backups'];
  
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`📁 Directory already exists: ${dir}`);
    }
  }
}

async function setupEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  
  if (fs.existsSync(envPath)) {
    console.log('📄 .env file already exists');
    const overwrite = await question('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      return;
    }
  }
  
  console.log('\n🔧 Setting up environment variables...');
  
  const discordToken = await question('Discord Bot Token: ');
  const guildId = await question('Guild ID (Discord Server ID): ');
  const marketChannelId = await question('Market Channel ID: ');
  const auctioneerRoleId = await question('Auctioneer Role ID: ');
  
  const databaseUrl = await question('Database URL (default: file:./data/market.db): ') || 'file:./data/market.db';
  const dealTimeoutHours = await question('Deal Timeout Hours (default: 12): ') || '12';
  const maxListingsPerUser = await question('Max Listings Per User (default: 10): ') || '10';
  const maxActiveDealsPerUser = await question('Max Active Deals Per User (default: 5): ') || '5';
  const logLevel = await question('Log Level (default: info): ') || 'info';
  
  const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=${discordToken}
GUILD_ID=${guildId}
MARKET_CHANNEL_ID=${marketChannelId}
AUCTIONEER_ROLE_ID=${auctioneerRoleId}

# Database Configuration
DATABASE_URL="${databaseUrl}"

# Bot Configuration
DEAL_TIMEOUT_HOURS=${dealTimeoutHours}
MAX_LISTINGS_PER_USER=${maxListingsPerUser}
MAX_ACTIVE_DEALS_PER_USER=${maxActiveDealsPerUser}

# Logging
LOG_LEVEL=${logLevel}
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created');
}

async function generatePrismaClient() {
  console.log('\n🔧 Generating Prisma client...');
  
  try {
    const { execSync } = await import('child_process');
    execSync('npm run db:generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Prisma client generated');
  } catch (error) {
    console.error('❌ Error generating Prisma client:', error.message);
  }
}

async function runMigrations() {
  console.log('\n🔧 Running database migrations...');
  
  try {
    const { execSync } = await import('child_process');
    execSync('npm run db:migrate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
  }
}

async function deployCommands() {
  const deployCommands = await question('\nDo you want to deploy Discord commands? (y/N): ');
  
  if (deployCommands.toLowerCase() === 'y') {
    console.log('\n🔧 Deploying Discord commands...');
    
    try {
      const { execSync } = await import('child_process');
      execSync('node scripts/deploy-commands.js', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ Discord commands deployed');
    } catch (error) {
      console.error('❌ Error deploying commands:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Discord Market Bot Setup');
  console.log('============================\n');
  
  try {
    await createDirectories();
    await setupEnvironment();
    await generatePrismaClient();
    await runMigrations();
    await deployCommands();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Make sure your bot has the required permissions on your Discord server');
    console.log('2. Run "npm start" to start the bot');
    console.log('3. Test the /market command in your Discord server');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    rl.close();
  }
}

main();
