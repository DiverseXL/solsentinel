function scoreOverview(ov) {
  if (!ov) return { score: 0, flags: ['Token data unavailable'], positives: [] };

  let score = 50;
  const flags = [];
  const positives = [];

  // Holder count
  const holders = ov.holder || 0;
  if (holders > 10000) {
    positives.push(`Strong community — ${holders.toLocaleString()} holders`);
  } else if (holders > 1000) {
    score -= 5;
    positives.push(`${holders.toLocaleString()} holders`);
  } else if (holders > 0) {
    score -= 15;
    flags.push(`Very few holders — only ${holders.toLocaleString()}`);
  } else {
    score -= 20;
    flags.push('Holder data unavailable');
  }

  // Buy/sell ratio (24h)
  const buys = ov.buy24h || 0;
  const sells = ov.sell24h || 0;
  if (buys > 0 && sells > 0) {
    const ratio = buys / (buys + sells);
    if (ratio > 0.6) {
      positives.push(`Strong buy pressure — ${(ratio * 100).toFixed(0)}% buys in 24h`);
    } else if (ratio < 0.35) {
      score -= 10;
      flags.push(`Heavy sell pressure — only ${(ratio * 100).toFixed(0)}% buys in 24h`);
    }
  }

  // Number of markets
  const markets = ov.numberMarkets || 0;
  if (markets >= 5) {
    positives.push(`Listed on ${markets} markets`);
  } else if (markets > 0) {
    score -= 5;
    flags.push(`Only on ${markets} market(s) — low exposure`);
  } else {
    score -= 10;
    flags.push('No market listings found');
  }

  // 24h volume
  const vol = ov.v24hUSD || 0;
  if (vol > 100000) {
    positives.push(`Strong volume — ${fmtUSD(vol)} in 24h`);
  } else if (vol > 10000) {
    // fine
  } else if (vol > 0) {
    score -= 10;
    flags.push(`Low 24h volume — only ${fmtUSD(vol)}`);
  } else {
    score -= 15;
    flags.push('No trading volume in 24h');
  }

  // Unique wallets 24h
  const wallets = ov.uniqueWallet24h || 0;
  if (wallets > 500) {
    positives.push(`${wallets.toLocaleString()} unique traders in 24h`);
  } else if (wallets < 50 && wallets > 0) {
    score -= 5;
    flags.push(`Only ${wallets} unique traders in 24h`);
  }

  return { score: Math.max(0, score), flags, positives };
}

function fmtUSD(num) {
  if (!num) return '$0';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function scoreLiquidity(liq) {
  if (!liq || !liq.hasLiquidity) {
    return { score: 0, flags: ['No Jupiter liquidity — cannot swap this token'], positives: [] };
  }

  const flags = [];
  const positives = [];
  let score = 0;

  if (liq.liquidityRating === 'high') {
    score = 30;
    positives.push(`Deep liquidity — only ${liq.priceImpact}% price impact on $500 swap`);
  } else if (liq.liquidityRating === 'medium') {
    score = 22;
    positives.push(`Moderate liquidity — ${liq.priceImpact}% price impact on $500 swap`);
  } else if (liq.liquidityRating === 'low') {
    score = 10;
    flags.push(`Thin liquidity — ${liq.priceImpact}% price impact on $500 swap`);
  } else {
    score = 2;
    flags.push(`Very thin liquidity — ${liq.priceImpact}% price impact on $500 swap`);
  }

  return { score, flags, positives };
}

function scoreDeployer(history) {
  if (!history || !Array.isArray(history)) {
    return { score: 10, flags: ['Deployer cross-chain history unavailable'], positives: [] };
  }

  const flags = [];
  const positives = [];
  let score = 20;

  const activeChains = history.filter(c => c.active);

  if (activeChains.length === 0) {
    score -= 5;
    flags.push('Deployer wallet has no cross-chain history');
  } else {
    positives.push(`Deployer active on ${activeChains.map(c => c.chain).join(', ')}`);
  }

  const totalDeploys = history.reduce((s, c) => s + (c.deployCount || 0), 0);
  if (totalDeploys > 10) {
    score -= 10;
    flags.push(`Serial deployer — ${totalDeploys} contracts across chains`);
  } else if (totalDeploys > 3) {
    score -= 4;
    flags.push(`${totalDeploys} prior contract deployments`);
  }

  const totalOutflows = history.reduce((s, c) => s + (c.outflows || 0), 0);
  if (totalOutflows > 5) {
    score -= 10;
    flags.push(`${totalOutflows} large outflows detected — possible previous rugs`);
  }

  return { score: Math.max(0, score), flags, positives };
}

function calculateSafetyScore({ overview, liquidity, deployerHistory }) {
  const ovResult  = scoreOverview(overview);
  const liqResult = scoreLiquidity(liquidity);
  const depResult = scoreDeployer(deployerHistory);

  const total = ovResult.score + liqResult.score + depResult.score;

  let verdict, emoji;
  if (total >= 75)      { verdict = 'SAFE';     emoji = '✅'; }
  else if (total >= 50) { verdict = 'CAUTION';  emoji = '⚠️'; }
  else                  { verdict = 'RUG RISK'; emoji = '🚨'; }

  return {
    score: total,
    verdict,
    emoji,
    breakdown: {
      overview: ovResult.score,
      liquidity: liqResult.score,
      deployer: depResult.score,
    },
    flags: [...ovResult.flags, ...liqResult.flags, ...depResult.flags],
    positives: [...ovResult.positives, ...liqResult.positives, ...depResult.positives],
  };
}

module.exports = { calculateSafetyScore };