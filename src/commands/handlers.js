const birdeye = require('../services/birdeye');
const jupiter = require('../services/jupiter');
const goldrush = require('../services/goldrush');
const { generateWalletSummary, generateTrendingCommentary } = require('../services/openai');
const { calculateSafetyScore } = require('../utils/scorer');
const { formatNewListings, formatTrending, formatWallet } = require('../utils/formatter');

async function newCommand(ctx) {
  const statusMsg = await ctx.reply('🔍 Fetching new listings and scoring them...');

  try {
    const listings = await birdeye.getNewListings(20);
    const tokens = listings?.items || listings || [];

    if (!tokens.length) {
      return ctx.telegram.editMessageText(
        ctx.chat.id, statusMsg.message_id, null,
        'No new listings found in the last hour.'
      );
    }

    const scored = await Promise.allSettled(
      tokens.slice(0, 10).map(async (t) => {
        const [security, liquidity] = await Promise.all([
          birdeye.getTokenSecurity(t.address),
          jupiter.checkLiquidity(t.address),
        ]);
        const result = calculateSafetyScore({ security, liquidity, deployerHistory: null });
        return { ...t, _safetyScore: result.score, _verdict: result.verdict };
      })
    );

    const scoredTokens = scored
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b._safetyScore - a._safetyScore);

    const message = formatNewListings(scoredTokens);

    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      message,
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    );

  } catch (err) {
    console.error('[/new] Error:', err.message);
    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      `❌ Error: ${err.message}`
    );
  }
}

async function trendingCommand(ctx) {
  const statusMsg = await ctx.reply('🔥 Fetching trending tokens...');

  try {
    const data = await birdeye.getTrending(10);
    const tokens = data?.tokens || data || [];

    const aiCommentary = await generateTrendingCommentary(tokens);
    const message = formatTrending(tokens, aiCommentary);

    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      message,
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    );

  } catch (err) {
    console.error('[/trending] Error:', err.message);
    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      `❌ Error: ${err.message}`
    );
  }
}

async function walletCommand(ctx) {
  const address = ctx.message?.text?.split(' ')[1]?.trim();

  if (!address || address.length < 30) {
    return ctx.reply('👁 Usage: /wallet <solana wallet address>');
  }

  const statusMsg = await ctx.reply('👁 Analyzing wallet...');

  try {
    const { generateWalletSummary } = require('../services/openai');

    // Fetch wallet data from Solscan public API
    const axios = require('axios');

    const [txRes, balRes] = await Promise.allSettled([
      axios.get(`https://public-api.solscan.io/account/transactions`, {
        params: { account: address, limit: 10 },
        headers: { 'accept': 'application/json' },
        timeout: 8000,
      }),
      axios.get(`https://public-api.solscan.io/account/tokens`, {
        params: { account: address },
        headers: { 'accept': 'application/json' },
        timeout: 8000,
      }),
    ]);

    const txns = txRes.status === 'fulfilled' ? txRes.value.data : [];
    const tokens = balRes.status === 'fulfilled' ? balRes.value.data : [];

    const topHoldings = Array.isArray(tokens)
      ? tokens.slice(0, 5).map(t => ({ symbol: t.tokenSymbol || 'Unknown', valueUsd: t.tokenAmount?.uiAmount || 0 }))
      : [];

    const aiSummary = await generateWalletSummary({
      walletAddress: address,
      birdeyeData: txns,
      crossChainData: [],
      topHoldings,
    });

    const { esc } = require('../utils/formatter');

    let msg = `👁 *Wallet X\\-Ray*\n`;
    msg += `\`${esc(address)}\`\n\n`;

    if (aiSummary) {
      msg += `🤖 *AI Classification*\n${esc(aiSummary)}\n\n`;
    }

    if (topHoldings.length > 0) {
      msg += `💼 *Top Holdings*\n`;
      topHoldings.forEach(t => {
        msg += `• ${esc(t.symbol)}: ${esc(String(t.valueUsd?.toFixed ? t.valueUsd.toFixed(4) : t.valueUsd))}\n`;
      });
      msg += '\n';
    }

    msg += `📜 Recent txns: ${Array.isArray(txns) ? txns.length : 0} shown\n\n`;
    msg += `[View on Solscan](https://solscan.io/account/${address})`;

    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      msg,
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    );

  } catch (err) {
    console.error('[/wallet] Error:', err.message);
    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      `❌ Wallet scan failed: ${err.message}`
    );
  }
}

module.exports = { newCommand, trendingCommand, walletCommand };