// In-memory alert store
// Structure: { chatId: { tokenAddress: { symbol, targetPrice, direction, lastPrice } } }
const alerts = {};

function addAlert(chatId, tokenAddress, symbol, lastPrice) {
  if (!alerts[chatId]) alerts[chatId] = {};
  alerts[chatId][tokenAddress] = { symbol, lastPrice };
  return true;
}

function removeAlert(chatId, tokenAddress) {
  if (alerts[chatId]) {
    delete alerts[chatId][tokenAddress];
    return true;
  }
  return false;
}

function getAlerts(chatId) {
  return alerts[chatId] || {};
}

function getAllAlerts() {
  return alerts;
}

module.exports = { addAlert, removeAlert, getAlerts, getAllAlerts };