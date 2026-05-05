const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 120 });

const BASE = 'https://api.covalenthq.com/v1';

const authHeader = () => ({
  Authorization: `Bearer ${process.env.GOLDRUSH_API_KEY}`,
  'Content-Type': 'application/json',
});

async function get(path, params = {}, ttl = 120) {
  const key = `gr:${path}:${JSON.stringify(params)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const { data } = await axios.get(`${BASE}${path}`, {
      headers: authHeader(),
      params,
      timeout: 12000,
    });
    if (data?.data) {
      cache.set(key, data.data, ttl);
      return data.data;
    }
    return null;
  } catch (err) {
    console.error(`[GoldRush] ${path} failed:`, err?.response?.data?.error_message || err.message);
    return null;
  }
}

async function scanDeployerHistory(deployerAddress) {
  const chains = [
    { id: 'eth-mainnet', label: 'Ethereum' },
    { id: 'matic-mainnet', label: 'Polygon' },
    { id: 'bsc-mainnet', label: 'BNB Chain' },
  ];

  const results = await Promise.allSettled(
    chains.map(async (chain) => {
      const data = await get(`/${chain.id}/address/${deployerAddress}/transactions_v3/`, {
        'page-size': 50,
        'no-logs': true,
      });

      if (!data?.items?.length) return { chain: chain.label, txCount: 0, active: false };

      const items = data.items;
      const deployCount = items.filter(tx => !tx.to_address).length;
      const outflows = items.filter(tx =>
        tx.from_address?.toLowerCase() === deployerAddress.toLowerCase() &&
        parseFloat(tx.value_quote || 0) > 1000
      ).length;

      return { chain: chain.label, txCount: items.length, deployCount, outflows, active: true };
    })
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

async function getWalletCrossChainSummary(walletAddress) {
  const chains = [
    { id: 'eth-mainnet', label: 'Ethereum' },
    { id: 'matic-mainnet', label: 'Polygon' },
    { id: 'bsc-mainnet', label: 'BNB Chain' },
  ];

  const results = await Promise.allSettled(
    chains.map(async (chain) => {
      const data = await get(`/${chain.id}/address/${walletAddress}/balances_v2/`, {
        'no-spam': true,
        nft: false,
      });

      if (!data?.items?.length) return null;

      const totalUsd = data.items.reduce((sum, t) => sum + (t.quote || 0), 0);
      const tokenCount = data.items.filter(t => t.quote > 1).length;

      return { chain: chain.label, totalUsd, tokenCount, active: totalUsd > 0 };
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)
    .filter(Boolean);
}

module.exports = { scanDeployerHistory, getWalletCrossChainSummary };