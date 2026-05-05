require('dotenv').config();

const { Telegraf } = require('telegraf');
const scanCommand = require('./commands/scan');
const { newCommand, trendingCommand, walletCommand } = require('./commands/handlers');

const required = ['TELEGRAM_BOT_TOKEN', 'BIRDEYE_API_KEY', 'OPENAI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    `👁 *Welcome to SolSentinel*\n\n` +
    `Your AI-powered Solana intelligence bot.\n\n` +
    `*Commands:*\n` +
    `/scan <address> — Full AI token safety scan\n` +
    `/new — New listings + instant safety scores\n` +
    `/trending — Top tokens + AI market commentary\n` +
    `/wallet <address> — Cross-chain wallet X-ray\n\n` +
    `_Powered by Birdeye · Jupiter · GoldRush · GPT-4o Mini_`,
    { parse_mode: 'Markdown' }
  );
});

bot.help((ctx) => {
  ctx.reply(
    `*SolSentinel Commands*\n\n` +
    `/scan <address> — Token safety scan\n` +
    `/new — New listings this hour\n` +
    `/trending — Trending tokens + AI take\n` +
    `/wallet <address> — Wallet intelligence`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('scan', scanCommand);
bot.command('new', newCommand);
bot.command('trending', trendingCommand);
bot.command('wallet', walletCommand);

// Auto-detect pasted token addresses
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)) {
    ctx.message.text = `/scan ${text}`;
    return scanCommand(ctx);
  }
  return next();
});

bot.catch((err, ctx) => {
  console.error(`[Bot] Error:`, err.message);
  ctx.reply('⚠️ Something went wrong. Try again in a moment.').catch(() => {});
});

async function main() {
  console.log('🚀 SolSentinel starting...');

  await bot.telegram.setMyCommands([
    { command: 'scan',     description: 'AI token safety scan' },
    { command: 'new',      description: 'New listings this hour' },
    { command: 'trending', description: 'Trending tokens + AI take' },
    { command: 'wallet',   description: 'Cross-chain wallet X-ray' },
  ]);

  await bot.launch();
  console.log('✅ SolSentinel is live');
}

main().catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));