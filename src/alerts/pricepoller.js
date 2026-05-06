const cron = require('node-cron');
const jupiter = require('../services/jupiter');
const { getAllAlerts, removeAlert } = require('../utils/alertstore');
const { esc } = require('../utils/formatter');

const CHANGE_THRESHOLD = 10; // alert when price moves 10%

async function checkAlerts(bot) {
  const allAlerts = getAllAlerts();

  for (const [chatId, tokens] of Object.entries(allAlerts)) {
    for (const [address, data] of Object.entries(tokens)) {
      try {
        const priceData = await jupiter.getPrice(address);
        if (!priceData?.price) continue;

        const currentPrice = priceData.price;
        const lastPrice = data.lastPrice;
        const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;

        if (Math.abs(changePercent) >= CHANGE_THRESHOLD) {
          const direction = changePercent > 0 ? '🟢 UP' : '🔴 DOWN';
          const arrow = changePercent > 0 ? '▲' : '▼';

          const msg =
            `🔔 *Price Alert Triggered\\!*\n\n` +
            `Token: *${esc(data.symbol)}*\n` +
            `Direction: ${direction}\n` +
            `Change: ${arrow} ${esc(Math.abs(changePercent).toFixed(2))}%\n` +
            `Last price: $${esc(lastPrice.toFixed(8))}\n` +
            `Current price: $${esc(currentPrice.toFixed(8))}\n\n` +
            `_Run /scan ${esc(address)} for full analysis_`;

          await bot.telegram.sendMessage(chatId, msg, {
            parse_mode: 'MarkdownV2',
          });

          // Update last price after alert
          data.lastPrice = currentPrice;
        }
      } catch (err) {
        console.error(`[PricePoller] Error checking ${address}:`, err.message);
      }
    }
  }
}

function startPoller(bot) {
  console.log('[PricePoller] Starting — checking every 2 minutes');
  cron.schedule('*/2 * * * *', () => checkAlerts(bot));
}

module.exports = { startPoller };