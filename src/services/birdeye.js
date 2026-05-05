const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60 });
const { throttle } = require('../utils/ratelimit');

const BASE = 'https://public-api.birdeye.so';

const HEADERS = () => ({
  'X-API-KEY': process.env.BIRDEYE_API_KEY,
  'x-chain': 'solana',
  'accept': 'application/json',
});

async function get(path, params = {}, ttl = 60) {
  const key = `be:${path}:${JSON.stringify(params)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  await throttle(); // wait if needed before firing

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

async function getTokenOverview(address) {
  return get(`/defi/token_overview`, { address }, 60);
}

module.exports = { getTokenOverview };