# 👁 SolSentinel — AI Solana Token Intelligence Bot

> Scan any Solana token in seconds. Get a live safety score, liquidity check, deployer history, and GPT-4o AI verdict — all inside Telegram.

Built for the **Birdeye Data BIP Competition Sprint 3** · `#BirdeyeAPI`

🤖 **Try it live:** [@sol\_senbot](https://t.me/sol_senbot) · 🐦 **Follow on X:** [@theyclonedsam](https://x.com/theyclonedsam)

---

## What it does

Most rug detectors only check one data source. SolSentinel combines **4 APIs** to give you intelligence no single source can provide:

| Command | What it does |
|---|---|
| `/scan <address>` | Full AI token safety scan — score 0-100, flags, verdict |
| `/new` | Emerging tokens watchlist with live safety scores |
| `/trending` | Top tokens by volume with GPT-4o AI commentary |
| `/wallet <address>` | Solana wallet X-ray + AI classification |
| `/summary` | Live Solana market summary — top gainer, loser, most traded |
| `/alert <address>` | Set a price alert — notified when token moves ±10% |
| `/myalerts` | View all your active price alerts |
| `/help` | Full usage guide |

---

## How the scoring works (0–100)

| Source | Max Points | What it checks |
|---|---|---|
| Birdeye Market Data | 50 | Holders, buy/sell pressure, volume, number of markets, unique traders |
| Jupiter Liquidity | 30 | Price impact on $500 swap — thin liquidity = danger |
| GoldRush Deployer | 20 | Cross-chain wallet history — serial deployers, prior outflows |

**Verdict:**
- `75–100` ✅ SAFE
- `50–74` ⚠️ CAUTION
- `0–49` 🚨 RUG RISK

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Telegram User                     │
│            /scan  /new  /trending  /alert            │
└────────────────────────┬─────────────────────────────┘
                         │
                    ┌────▼────┐
                    │  bot.js │  ← Telegraf entry point
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌──────▼──────┐   ┌────▼─────┐
   │  scan   │    │  handlers   │   │  poller  │
   │ command │    │  (commands) │   │  (cron)  │
   └────┬────┘    └──────┬──────┘   └────┬─────┘
        │                │               │
        └────────┬───────┘               │
                 │                       │
     ┌───────────▼───────────────────────▼──┐
     │            Service Layer             │
     │                                      │
     │  birdeye.js   — Market data & token  │
     │                 overviews            │
     │  jupiter.js   — Price feed &         │
     │                 liquidity checks     │
     │  goldrush.js  — Cross-chain          │
     │                 deployer history     │
     │  openai.js    — GPT-4o verdicts &    │
     │                 market commentary    │
     └───────────┬──────────────────────────┘
                 │
     ┌───────────▼──────────────────────────┐
     │            Utility Layer             │
     │                                      │
     │  scorer.js    — Safety score engine  │
     │  formatter.js — MarkdownV2 output    │
     │  alertstore.js— In-memory alert DB   │
     │  ratelimit.js — API throttle guard   │
     └──────────────────────────────────────┘
```

---

## Project structure

```
solsentinel/
├── src/
│   ├── bot.js                  # Entry point — Telegraf bot, command routing
│   ├── commands/
│   │   ├── scan.js             # /scan — full token safety analysis
│   │   └── handlers.js         # /new, /trending, /wallet, /summary, /alert, /myalerts
│   ├── services/
│   │   ├── birdeye.js          # Birdeye API — token overviews, market data
│   │   ├── jupiter.js          # Jupiter API — price feed (v3), swap quotes, liquidity
│   │   ├── goldrush.js         # GoldRush/Covalent API — cross-chain deployer scan
│   │   └── openai.js           # OpenAI GPT-4o Mini — AI verdicts & commentary
│   ├── alerts/
│   │   └── pricepoller.js      # Cron job — checks prices every 2 min, fires alerts
│   └── utils/
│       ├── scorer.js           # Safety scoring engine (0-100)
│       ├── formatter.js        # Telegram MarkdownV2 message formatting
│       ├── alertstore.js       # In-memory alert storage
│       └── ratelimit.js        # API call throttling
├── .env                        # API keys (not committed)
├── .gitignore
├── package.json
└── README.md
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Bot framework | [Telegraf](https://telegraf.js.org/) v4 |
| Market data | [Birdeye API](https://birdeye.so/) — token overviews, holder data, volume |
| Price & liquidity | [Jupiter API](https://station.jup.ag/) v3 — real-time prices, swap quotes |
| Deployer intel | [GoldRush / Covalent](https://www.covalenthq.com/) — cross-chain transaction history |
| AI verdicts | [OpenAI GPT-4o Mini](https://openai.com/) — natural language risk analysis |
| Caching | [node-cache](https://www.npmjs.com/package/node-cache) — per-endpoint TTL caching |
| Scheduling | [node-cron](https://www.npmjs.com/package/node-cron) — 2-minute price alert poller |
| HTTP | [Axios](https://axios-http.com/) |
| Hosting | [Railway](https://railway.app/) |

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/DiverseXL/solsentinel.git
cd solsentinel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BIRDEYE_API_KEY=your_birdeye_api_key
OPENAI_API_KEY=your_openai_api_key
GOLDRUSH_API_KEY=your_goldrush_api_key
JUP_API_KEY=your_jupiter_api_key     # optional — for higher rate limits
```

| Key | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram |
| `BIRDEYE_API_KEY` | [birdeye.so](https://birdeye.so/) — Developer portal |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/) |
| `GOLDRUSH_API_KEY` | [goldrush.dev](https://goldrush.dev/) (Covalent) |
| `JUP_API_KEY` | [portal.jup.ag](https://portal.jup.ag/) — optional |

### 4. Run locally

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

---

## Deploy to Railway

1. Push to GitHub
2. Connect the repo in [Railway](https://railway.app/)
3. Add all `.env` variables in the Railway dashboard
4. Railway auto-deploys on push — the bot includes a 5-second startup delay and 409 conflict handling to prevent crashes on redeploy

---

## API usage & rate limits

SolSentinel is designed to stay within free tiers:

- **Birdeye** — Throttled via `ratelimit.js` (1 call/sec), results cached 60s
- **Jupiter** — Price cached 20s, liquidity cached 15s
- **GoldRush** — Deployer scans cached 120s
- **OpenAI** — Only called once per `/scan`, `/trending`, `/summary`, `/wallet`

---

## How `/scan` works (end to end)

```
User sends: /scan DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

1. Resolve input      → if symbol, resolve to mint via Jupiter token list
2. Birdeye overview   → price, volume, holders, buy/sell ratio, markets
3. Jupiter liquidity  → simulate $500 USDC swap, measure price impact
4. Calculate score    → weighted formula → 0-100 safety score
5. GPT-4o verdict     → AI reads all data, writes 2-sentence risk summary
6. Format & reply     → MarkdownV2 message with score bar, flags, links
```

---

## License

MIT

---

## Disclaimer

⚠️ **SolSentinel is a research tool only.** Nothing here is financial advice. Always do your own research before trading. You are solely responsible for your investment decisions.
