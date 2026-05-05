// Simple queue to space out API calls — max 1 per second
let lastCall = 0;

async function throttle(ms = 1100) {
  const now = Date.now();
  const wait = ms - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
}

module.exports = { throttle };