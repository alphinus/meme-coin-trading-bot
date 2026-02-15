// Main Entry Point
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { SniperBot } from './sniper';

// Load wallet from environment or generate new one
function loadWallet(): Keypair {
  // Try to load from file first
  const walletPath = path.join(process.cwd(), 'wallet.json');
  
  if (fs.existsSync(walletPath)) {
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(walletData));
  }
  
  // Generate new wallet if none exists
  const keypair = Keypair.generate();
  
  // Save to file (in production, use secure key management)
  fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
  
  console.log('⚠️  New wallet generated and saved to wallet.json');
  console.log(`   Public Key: ${keypair.publicKey.toString()}`);
  console.log('   IMPORTANT: Save this keypair securely!');
  
  return keypair;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('          MEMECOIN SNIPER - Premium Trading System             ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Load or generate wallet
  const wallet = loadWallet();
  
  // Create sniper bot
  const initialCapital = parseInt(process.env.INITIAL_CAPITAL || '10000');
  const sniper = new SniperBot(wallet, initialCapital);
  
  // Setup event handlers
  sniper.on('started', () => {
    console.log('🤖 Bot is running...\n');
  });
  
  sniper.on('positionOpened', (position) => {
    console.log(`📌 New position opened: ${position.tokenAddress}`);
  });
  
  sniper.on('positionClosed', ({ position, reason }) => {
    console.log(`📌 Position closed: ${position.tokenAddress} - ${reason}`);
  });
  
  sniper.on('tradeFailed', ({ error }) => {
    console.log(`❌ Trade failed: ${error}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received shutdown signal...');
    await sniper.stop();
    process.exit(0);
  });
  
  // Start the bot
  await sniper.start();
  
  // Log status every 30 seconds
  setInterval(() => {
    const status = sniper.getStatus();
    console.log(`\n📊 Status: ${status.positions} positions | Portfolio: $${status.portfolio.totalValueUsd.toFixed(2)}`);
  }, 30000);
}

main().catch(console.error);
