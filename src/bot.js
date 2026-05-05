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
    `👁 *SolSentinel Help Guide*\n\n` +

    `*What is SolSentinel?*\n` +
    `An AI-powered Solana intelligence bot that scans tokens, tracks new listings, and gives you GPT-4o powered verdicts — all in seconds.\n\n` +

    `*Commands*\n\n` +

    `🔍 /scan <address>\n` +
    `Scans any Solana token and gives it a safety score from 0-100.\n` +
    `Example: /scan DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\n\n` +

    `🆕 /new\n` +
    `Shows the newest Solana token listings from the last hour, each with an instant safety score. Great for spotting early gems before they trend.\n\n` +

    `🔥 /trending\n` +
    `Shows the top Solana tokens by volume right now, with an AI-generated market commentary.\n\n` +

    `👁 /wallet <address>\n` +
    `Scans any Solana wallet and gives you a cross-chain breakdown — holdings, transaction history, and an AI classification (Smart Money, Degen, Bot, Whale etc).\n` +
    `Example: /wallet 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\n\n` +

    `*How scoring works*\n` +
    `✅ 75-100 — SAFE\n` +
    `⚠️ 50-74 — CAUTION\n` +
    `🚨 0-49  — RUG RISK\n\n` +

    `Scores are based on:\n` +
    `• Holder count & buy/sell pressure (Birdeye)\n` +
    `• Liquidity depth — $500 swap impact (Jupiter)\n` +
    `• Deployer cross-chain history (GoldRush)\n\n` +

    `*Tips*\n` +
    `• You can paste a token address directly without /scan\n` +
    `• Always check /new early — gems get sniped fast\n` +
    `• Low score doesn't always mean rug — new tokens naturally score lower\n\n` +

    `*Built with*\n` +
    `Birdeye · Jupiter · GoldRush · GPT-4o Mini\n\n` +

    `_Questions? Feedback? Tag us on X @SolSentinelBot_\n\n` +
    `⚠️ *Disclaimer:* SolSentinel is a research tool only. Nothing here is financial advice. Always do your own research before trading. You are solely responsible for your investment decisions.`,
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