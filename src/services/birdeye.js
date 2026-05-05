const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 30 });

const BASE = 'https://public-api.birdeye.so';

const HEADERS = () => ({
  'X-API-KEY': process.env.BIRDEYE_API_KEY,
  'x-chain': 'solana',
  'accept': 'application/json',
});

async function get(path, params = {}, ttl = 30) {
  const key = `be:${path}:${JSON.stringify(params)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const { data } = await axios.get(`${BASE}${path}`, {
      headers: HEADERS(),
      params,
      timeout: 10000,
    });
    if (data?.data !== undefined) {
      cache.set(key, data.data, ttl);
      return data.data;
    }
    return null;
  } catch (err) {
    console.error(`[Birdeye] ${path} failed:`, err?.response?.data?.message || err.message);
    return null;
  }
}

async function getTokenSecurity(address) {
  return get(`/defi/token_security`, { address, chain_id: 'solana' }, 60);
}

async function getTokenOverview(address) {
  return get(`/defi/token_overview`, { address }, 30);
}

async function getTrending(limit = 10) {
  return get(`/defi/tokenlist`, { sort_by: 'v24hUSD', sort_type: 'desc', offset: 0, limit, min_liquidity: 1000 }, 60);
}

async function getNewListings(limit = 20) {
  const time_to = Math.floor(Date.now() / 1000);
  const time_from = time_to - 60 * 60;
  return get(`/defi/v2/tokens/new_listing`, { limit, time_from, time_to, sort_type: 'desc' }, 30);
}

async function getTokenMeta(address) {
  return get(`/defi/v3/token/meta-data/single`, { address }, 120);
}

async function getWalletPortfolio(wallet) {
  return get(`/v1/wallet/token_list`, { wallet }, 60);
}

async function getWalletTxns(wallet, limit = 20) {
  return get(`/v1/wallet/tx_list`, { wallet, limit }, 60);
}

module.exports = {
  getTokenSecurity,
  getTokenOverview,
  getTrending,
  getNewListings,
  getTokenMeta,
  getWalletPortfolio,
  getWalletTxns,
};