const birdeye = require('../services/birdeye');
const jupiter = require('../services/jupiter');
const { generateWalletSummary, generateTrendingCommentary } = require('../services/openai');
const { calculateSafetyScore } = require('../utils/scorer');
const { formatTrending, esc, fmtUSD } = require('../utils/formatter');

// Top Solana tokens — live data fetched via /defi/token_overview (working endpoint)
const TRENDING_TOKENS = [
  'So11111111111111111111111111111111111111112',    // SOL
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',  // JUP
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // PYTH
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',  // JTO
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',  // ORCA
];

// Emerging / smaller tokens — scored live with overview + Jupiter liquidity
const EMERGING_TOKENS = [
  '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ', // W
  'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6', // TENSOR
  'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7', // DRIFT
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',  // RENDER
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
];

async function trendingCommand(ctx) {
  const statusMsg = await ctx.reply('🔥 Fetching trending tokens...');

  try {
    // Fetch live overview data for each hardcoded token (sequential — throttled)
    const tokens = [];
    for (const addr of TRENDING_TOKENS) {
      const ov = await birdeye.getTokenOverview(addr);
      if (ov) {
        tokens.push({
          name: ov.name || 'Unknown',
          symbol: ov.symbol || '?',
          address: addr,
          price: ov.price || 0,
          v24hUSD: ov.v24hUSD || 0,
          price24hChangePercent: ov.priceChange24hPercent || 0,
        });
      }
    }

    if (!tokens.length) {
      return ctx.telegram.editMessageText(
        ctx.chat.id, statusMsg.message_id, null,
        'Could not fetch trending tokens right now.'
      );
    }

    // Sort by 24h volume descending
    tokens.sort((a, b) => b.v24hUSD - a.v24hUSD);

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

async function newCommand(ctx) {
  const statusMsg = await ctx.reply('🔍 Scanning emerging tokens...');

  try {
    // Fetch overviews sequentially (throttled Birdeye calls)
    const tokenData = [];
    for (const addr of EMERGING_TOKENS) {
      const ov = await birdeye.getTokenOverview(addr);
      if (ov) tokenData.push({ address: addr, overview: ov });
    }

    if (!tokenData.length) {
      return ctx.telegram.editMessageText(
        ctx.chat.id, statusMsg.message_id, null,
        'Could not fetch token data right now.'
      );
    }

    // Fetch Jupiter liquidity in parallel (different API, no Birdeye throttle)
    const scored = await Promise.allSettled(
      tokenData.map(async (t) => {
        const liquidity = await jupiter.checkLiquidity(t.address);
        const result = calculateSafetyScore({ overview: t.overview, liquidity, deployerHistory: null });
        return {
          name: t.overview.name || 'Unknown',
          symbol: t.overview.symbol || '?',
          address: t.address,
          price: t.overview.price || 0,
          _safetyScore: result.score,
          _verdict: result.verdict,
        };
      })
    );

    const scoredTokens = scored
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b._safetyScore - a._safetyScore);

    // Build message inline (custom heading for emerging tokens)
    let msg = `🔍 *Emerging Tokens \\(Solana\\)*\n\n`;
    scoredTokens.slice(0, 8).forEach((t, i) => {
      const score = t._safetyScore ?? '?';
      const emoji = score >= 75 ? '✅' : score >= 50 ? '⚠️' : '🚨';
      const name = esc(t.name || 'Unknown');
      const symbol = esc(t.symbol || '?');
      const address = esc(t.address || '');
      const price = esc(t.price ? t.price.toFixed(8) : 'N/A');
      msg += `${i + 1}\\. ${emoji} *${name}* \\(${symbol}\\)\n`;
      msg += `   Score: ${score}/100 · Price: $${price}\n`;
      msg += `   \`${address}\`\n\n`;
    });
    msg += `_Run /scan \\<address\\> for full analysis_`;

    await ctx.telegram.editMessageText(
      ctx.chat.id, statusMsg.message_id, null,
      msg,
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

async function walletCommand(ctx) {
  const address = ctx.message?.text?.split(' ')[1]?.trim();

  if (!address || address.length < 30) {
    return ctx.reply('👁 Usage: /wallet <solana wallet address>');
  }

  const statusMsg = await ctx.reply('👁 Analyzing wallet...');

  try {
    const axios = require('axios');
    const RPC_URL = 'https://api.mainnet-beta.solana.com';

    // Fetch wallet data from Solana RPC
    const [sigRes, tokenRes] = await Promise.allSettled([
      axios.post(RPC_URL, {
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [address, { "limit": 10 }]
      }),
      axios.post(RPC_URL, {
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
          { "encoding": "jsonParsed" }
        ]
      })
    ]);

    const signatures = sigRes.status === 'fulfilled' ? sigRes.value.data?.result : [];
    const tokenAccounts = tokenRes.status === 'fulfilled' ? tokenRes.value.data?.result?.value : [];

    const txCount = Array.isArray(signatures) ? signatures.length : 0;
    const tokenCount = Array.isArray(tokenAccounts) ? tokenAccounts.length : 0;
    
    const mostRecentTx = signatures?.[0];
    const lastActiveDate = mostRecentTx?.blockTime 
      ? new Date(mostRecentTx.blockTime * 1000).toLocaleDateString()
      : 'N/A';

    const topHoldings = Array.isArray(tokenAccounts)
      ? tokenAccounts.slice(0, 5).map(item => {
          const info = item.account.data.parsed.info;
          return {
            mint: info.mint,
            uiAmount: info.tokenAmount.uiAmount
          };
        })
      : [];

    const aiSummary = await generateWalletSummary({
      walletAddress: address,
      txCount,
      tokenCount,
      topHoldings,
    });

    let msg = `👁 *Wallet X\\-Ray*\n`;
    msg += `\`${esc(address)}\`\n\n`;

    if (aiSummary) {
      msg += `🤖 *AI Classification*\n${esc(aiSummary)}\n\n`;
    }

    if (topHoldings.length > 0) {
      msg += `💼 *Top Holdings*\n`;
      topHoldings.forEach(t => {
        const displayMint = t.mint.slice(0, 4) + '...' + t.mint.slice(-4);
        msg += `• \`${esc(displayMint)}\`: ${esc(String(t.uiAmount))}\n`;
      });
      msg += '\n';
    }

    msg += `📜 Recent txns: ${txCount} shown \\(Last active: ${esc(lastActiveDate)}\\)\n`;
    msg += `🪙 Tokens found: ${tokenCount}\n\n`;
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