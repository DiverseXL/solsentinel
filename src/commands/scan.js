const birdeye = require('../services/birdeye');
const jupiter = require('../services/jupiter');
const { generateTokenVerdict } = require('../services/openai');
const { calculateSafetyScore } = require('../utils/scorer');
const { formatScanResult } = require('../utils/formatter');

module.exports = async function scanCommand(ctx) {
  const input = ctx.message?.text?.split(' ').slice(1).join(' ')?.trim();

  if (!input) {
    return ctx.reply(
      '🔍 Usage: /scan <token address or symbol>\n\nExample:\n/scan DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    );
  }

  let address = input;
  if (input.length < 30) {
    const resolving = await ctx.reply(`🔎 Resolving *${input}*...`, { parse_mode: 'Markdown' });
    address = await jupiter.resolveMint(input);
    if (!address) {
      return ctx.telegram.editMessageText(
        ctx.chat.id, resolving.message_id, null,
        `❌ Could not find token: *${input}*. Try the full contract address.`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  const statusMsg = await ctx.reply(
    `⏳ Scanning \`${address.slice(0, 8)}...\`\n_Pulling market data, liquidity..._`,
    { parse_mode: 'Markdown' }
  );

  try {
    // Only use working endpoints: token_overview (Birdeye) + liquidity (Jupiter)
    const overview = await birdeye.getTokenOverview(address);
    const liquidity = await jupiter.checkLiquidity(address);

    const scoreResult = calculateSafetyScore({ overview, liquidity, deployerHistory: null });

    const aiVerdict = await generateTokenVerdict({
      tokenName: overview?.name || 'Unknown',
      tokenSymbol: overview?.symbol || '???',
      score: scoreResult.score,
      verdict: scoreResult.verdict,
      flags: scoreResult.flags,
      positives: scoreResult.positives,
      overview,
      liquidity,
    });

    // Pass overview as meta since getTokenMeta is blocked
    const message = formatScanResult({ meta: overview, overview, scoreResult, liquidity, aiVerdict });

    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      message,
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    );

  } catch (err) {
    console.error('[/scan] Error:', err.message);
    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      `❌ Scan failed: ${err.message}`
    );
  }
};