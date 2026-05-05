const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

async function generateTokenVerdict({ tokenName, tokenSymbol, score, verdict, flags, positives, overview, liquidity }) {
  const prompt = `You are SolSentinel, a blunt Solana trading intelligence bot. Analyze this token and write a 2-3 sentence verdict.

Token: ${tokenName} (${tokenSymbol})
Safety score: ${score}/100 — ${verdict}
Red flags: ${flags.length > 0 ? flags.join('; ') : 'None'}
Positives: ${positives.length > 0 ? positives.join('; ') : 'None'}
Price: $${overview?.price?.toFixed(8) || 'unknown'}
24h volume: $${overview?.v24hUSD?.toLocaleString() || 'unknown'}
Holders: ${overview?.holder || 'unknown'}
Liquidity: ${liquidity?.liquidityRating || 'unknown'} (${liquidity?.priceImpact}% price impact on $500 swap)

Write a direct, confident verdict. No fluff. Crypto-native tone. If it's risky, say exactly why. If it looks safe, say what stands out positively. End with a one-line trading consideration.`;

  try {
    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 180,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('[OpenAI] Token verdict failed:', err.message);
    return null;
  }
}

async function generateWalletSummary({ walletAddress, txCount, tokenCount, topHoldings }) {
  const prompt = `You are SolSentinel. Analyze this Solana wallet and classify it in 2-3 sentences.

Wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}
Tokens found: ${tokenCount || 0}
Recent transactions: ${txCount || 0}
Top holdings (mints): ${topHoldings?.slice(0, 3).map(h => h.mint || 'Unknown').join(', ') || 'Unknown'}

Classify this wallet as one of: Smart Money | Active Trader | Degen | Bot | Whale | Fresh Wallet
Give your classification and brief reasoning. Note any interesting patterns. Keep it punchy.`;

  try {
    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('[OpenAI] Wallet summary failed:', err.message);
    return null;
  }
}

async function generateTrendingCommentary(tokens) {
  const tokenList = tokens.slice(0, 5).map((t, i) =>
    `${i + 1}. ${t.name} (${t.symbol}) — price $${t.price?.toFixed(6)}, 24h change: ${t.price24hChangePercent?.toFixed(1)}%, volume $${t.v24hUSD?.toLocaleString()}`
  ).join('\n');

  const prompt = `You are SolSentinel. Give a 2-sentence take on today's Solana trending tokens. Be punchy and direct — what's the market mood? Any standouts?

Trending now:
${tokenList}

Max 2 sentences. Crypto-native tone.`;

  try {
    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('[OpenAI] Trending commentary failed:', err.message);
    return null;
  }
}

module.exports = {
  generateTokenVerdict,
  generateWalletSummary,
  generateTrendingCommentary,
};