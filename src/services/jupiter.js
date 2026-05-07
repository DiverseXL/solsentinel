const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 20 });

const BASE_PRICE = 'https://api.jup.ag/price/v2';
const BASE_QUOTE = 'https://api.jup.ag/swap/v1';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const JUP_API_KEY = process.env.JUP_API_KEY || '';

async function get(url, params = {}, ttl = 20, headers = {}) {
  const key = `jup:${url}:${JSON.stringify(params)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const { data } = await axios.get(url, { params, headers, timeout: 8000 });
    cache.set(key, data, ttl);
    return data;
  } catch (err) {
    console.error(`[Jupiter] failed:`, err?.response?.data?.error || err.message);
    return null;
  }
}

async function getPrice(mintAddress) {
  const headers = JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {};
  const data = await get(`${BASE_PRICE}`, { ids: mintAddress }, 20, headers);
  return data?.data?.[mintAddress] || null;
}

async function checkLiquidity(tokenMint) {
  try {
    const usdcAmount = 500 * 1_000_000;
    const data = await get(`${BASE_QUOTE}/quote`, {
      inputMint: USDC,
      outputMint: tokenMint,
      amount: usdcAmount,
      slippageBps: 50,
    }, 15);

    if (!data) return { hasLiquidity: false, priceImpact: null, error: 'No route found' };

    const impact = parseFloat(data.priceImpactPct || '0') * 100;
    return {
      hasLiquidity: true,
      priceImpact: parseFloat(impact.toFixed(2)),
      liquidityRating: impact < 2 ? 'high' : impact < 5 ? 'medium' : impact < 15 ? 'low' : 'very_low',
    };
  } catch (err) {
    return { hasLiquidity: false, priceImpact: null, error: err.message };
  }
}

async function resolveMint(symbolOrMint) {
  if (symbolOrMint.length > 30) return symbolOrMint;

  try {
    const { data } = await axios.get('https://token.jup.ag/strict', { timeout: 8000 });
    const found = data.find(t => t.symbol?.toLowerCase() === symbolOrMint.toLowerCase());
    return found?.address || null;
  } catch {
    return null;
  }
}

module.exports = { getPrice, checkLiquidity, resolveMint, USDC };