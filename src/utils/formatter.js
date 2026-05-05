function esc(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

function fmtUSD(num) {
  if (!num) return '$0';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function scoreBar(score) {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function formatScanResult({ meta, overview, scoreResult, liquidity, aiVerdict }) {
  const name = esc(meta?.name || overview?.name || 'Unknown Token');
  const symbol = esc(meta?.symbol || overview?.symbol || '???');
  const address = meta?.address || overview?.address || '';
  const { score, verdict, emoji, breakdown, flags, positives } = scoreResult;

  const price = overview?.price;
  const priceStr = price
    ? (price < 0.0001 ? price.toExponential(4) : price.toFixed(6))
    : 'N/A';

  const change = overview?.priceChange24hPercent ?? overview?.price24hChangePercent;
  const changeStr = change !== undefined
    ? `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%`
    : 'N/A';

  let msg = `${emoji} *${name}* \\(${symbol}\\)\n`;
  msg += `\`${esc(address)}\`\n\n`;
  msg += `*Safety Score: ${score}/100*\n`;
  msg += `\`${scoreBar(score)}\`\n`;
  msg += `Verdict: *${esc(verdict)}*\n\n`;
  msg += `📊 *Market Data*\n`;
  msg += `Price: \`$${esc(priceStr)}\`  ${esc(changeStr)}\n`;
  msg += `Volume 24h: ${esc(fmtUSD(overview?.v24hUSD))}\n`;
  msg += `Market Cap: ${esc(fmtUSD(overview?.marketCap || overview?.mc))}\n`;
  msg += `Holders: ${esc(String(overview?.holder || 'N/A'))}\n\n`;
  msg += `💧 *Liquidity \\(Jupiter\\)*\n`;
  msg += `Rating: ${esc(liquidity?.liquidityRating || 'N/A')}\n`;
  msg += `Price impact \\($500 swap\\): ${esc(String(liquidity?.priceImpact ?? 'N/A'))}%\n\n`;
  msg += `*Score Breakdown*\n`;
  msg += `Market: ${breakdown.overview}/50  Liquidity: ${breakdown.liquidity}/30  Deployer: ${breakdown.deployer}/20\n\n`;

  if (flags.length > 0) {
    msg += `🚩 *Red Flags*\n`;
    flags.forEach(f => { msg += `• ${esc(f)}\n`; });
    msg += '\n';
  }

  if (positives.length > 0) {
    msg += `✅ *Positives*\n`;
    positives.forEach(p => { msg += `• ${esc(p)}\n`; });
    msg += '\n';
  }

  if (aiVerdict) {
    msg += `🤖 *AI Analysis*\n${esc(aiVerdict)}\n\n`;
  }

  msg += `[Birdeye](https://birdeye.so/token/${address}?chain=solana) · [Jupiter](https://jup.ag/swap/SOL-${address})`;

  return msg;
}

function formatNewListings(tokens) {
  if (!tokens?.length) return 'No new listings found in the last hour\\.';

  let msg = `🆕 *New Solana Tokens \\(last hour\\)*\n\n`;
  tokens.slice(0, 8).forEach((t, i) => {
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
  return msg;
}

function formatTrending(tokens, aiCommentary) {
  if (!tokens?.length) return 'Could not fetch trending tokens right now\\.';

  let msg = `🔥 *Trending on Solana*\n\n`;

  if (aiCommentary) {
    msg += `🤖 ${esc(aiCommentary)}\n\n`;
  }

  tokens.slice(0, 8).forEach((t, i) => {
    const change = t.price24hChangePercent ?? t.priceChange24hPercent ?? 0;
    const arrow = change > 0 ? '▲' : '▼';
    msg += `${i + 1}\\. *${esc(t.name || 'N/A')}* \\(${esc(t.symbol || '?')}\\)\n`;
    msg += `   $${esc(t.price?.toFixed(6) || 'N/A')}  ${arrow} ${esc(Math.abs(change).toFixed(1))}%  Vol: ${esc(fmtUSD(t.v24hUSD))}\n`;
  });

  return msg;
}

function formatWallet({ address, portfolio, txns, crossChain, aiSummary }) {
  let msg = `👁 *Wallet X\\-Ray*\n`;
  msg += `\`${esc(address)}\`\n\n`;

  if (aiSummary) {
    msg += `🤖 *AI Classification*\n${esc(aiSummary)}\n\n`;
  }

  if (crossChain?.length > 0) {
    msg += `🌐 *Cross\\-Chain Footprint*\n`;
    crossChain.filter(c => c.active).forEach(c => {
      msg += `• ${esc(c.chain)}: ${esc(fmtUSD(c.totalUsd))} \\(${c.tokenCount} tokens\\)\n`;
    });
    msg += '\n';
  }

  const topHoldings = portfolio?.items?.filter(t => t.valueUsd > 1).slice(0, 5) || [];
  if (topHoldings.length > 0) {
    msg += `💼 *Top Solana Holdings*\n`;
    topHoldings.forEach(t => {
      msg += `• ${esc(t.symbol || 'Unknown')}: ${esc(fmtUSD(t.valueUsd))}\n`;
    });
    msg += '\n';
  }

  msg += `📜 Recent txns: ${txns?.length || 0} shown\n`;
  msg += `[View on Solscan](https://solscan.io/account/${address})`;

  return msg;
}

function formatAlert({ name, symbol, address, score, positives }) {
  const emoji = score >= 80 ? '✅' : '⚠️';
  let msg = `${emoji} *New token passed safety check*\n\n`;
  msg += `*${esc(name)}* \\(${esc(symbol)}\\)\n`;
  msg += `Score: ${score}/100\n`;
  msg += `\`${esc(address)}\`\n\n`;
  if (positives?.length) {
    msg += positives.slice(0, 2).map(p => `✓ ${esc(p)}`).join('\n');
    msg += '\n\n';
  }
  msg += `Run /scan ${esc(address)} for full analysis`;
  return msg;
}

module.exports = {
  formatScanResult,
  formatNewListings,
  formatTrending,
  formatWallet,
  formatAlert,
  esc,
  fmtUSD,
};