# OpenClaw + PolyClaw: Oracle Gap Arbitrage Setup Guide

## Overview

This guide walks you through setting up OpenClaw with the PolyClaw skill to run Oracle Gap arbitrage on Polymarket using Claude Opus 4.6 as your reasoning engine.

**Strategy:** The Oracle Gap exploits latency between centralized exchange price movements and Polymarket odds adjustments. When major news breaks, exchange perpetual contracts react in milliseconds, but Polymarket prediction pools can lag — PolyClaw monitors this spread and executes trades to capture the gap.

---

## Prerequisites

Before you begin, you'll need:

- **A computer** running macOS, Linux, or Windows (WSL2) with Node.js 22+ and Python 3.11+
- **$500+ in USDC.e** bridged to the Polygon network (your trading capital)
- **~0.5 POL** for gas fees (contract approvals + transactions)
- **A dedicated wallet** (MetaMask or similar) — never use your main wallet

---

## Step 1: Create Required Accounts

### 1a. Polymarket Account
1. Go to [polymarket.com](https://polymarket.com)
2. Connect your wallet (MetaMask recommended)
3. Complete any required verification
4. **Important:** Polymarket operates on Polygon — make sure your wallet is on the Polygon network

### 1b. Chainstack Account (Free Polygon RPC Node)
1. Sign up at [chainstack.com](https://chainstack.com) (free tier available)
2. Create a new project → Add a Polygon mainnet node
3. Copy your HTTPS endpoint URL — it will look like:
   `https://polygon-mainnet.core.chainstack.com/YOUR_API_KEY`
4. This gives you a fast, reliable RPC connection to Polygon

### 1c. OpenRouter API Key (for LLM-powered hedge analysis)
1. Go to [openrouter.ai](https://openrouter.ai)
2. Create an account and generate an API key
3. The default model (`nvidia/nemotron-nano-9b-v2:free`) works well for hedge scanning
4. For Oracle Gap analysis with Opus 4.6, you'll configure this separately

### 1d. Anthropic API Key (for Opus 4.6)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key for Claude Opus 4.6 (`claude-opus-4-6-20260214`)
3. This powers the core reasoning and trading decisions

---

## Step 2: Install OpenClaw

### Option A: npm (Recommended)
```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### Option B: Build from Source
```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build
pnpm build
openclaw onboard --install-daemon
```

The onboarding wizard will walk you through setting up your gateway, workspace, and channels (Telegram, Discord, etc.).

---

## Step 3: Install the PolyClaw Skill

### Via ClawHub (Recommended)
```bash
clawhub install polyclaw
cd ~/.openclaw/skills/polyclaw
uv sync
```

### Manual Installation
```bash
git clone https://github.com/chainstacklabs/polyclaw.git ~/.openclaw/skills/polyclaw
cd ~/.openclaw/skills/polyclaw
uv sync
```

---

## Step 4: Configure OpenClaw

Edit your `~/.openclaw/openclaw.json` file. A template is provided in this folder as `openclaw-config-template.json`. The key sections are:

```json
{
  "skills": {
    "entries": {
      "polyclaw": {
        "enabled": true,
        "env": {
          "CHAINSTACK_NODE": "https://polygon-mainnet.core.chainstack.com/YOUR_KEY",
          "POLYCLAW_PRIVATE_KEY": "0xYOUR_WALLET_PRIVATE_KEY",
          "OPENROUTER_API_KEY": "sk-or-v1-YOUR_KEY"
        }
      }
    }
  }
}
```

### Using Opus 4.6 as the Reasoning Engine

In your `openclaw.json`, set the model provider to Anthropic and specify Opus 4.6:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-opus-4-6-20260214",
    "apiKey": "sk-ant-YOUR_ANTHROPIC_API_KEY"
  }
}
```

This ensures all trading decisions, market analysis, and risk assessment are powered by Opus 4.6.

---

## Step 5: Fund Your Wallet

1. **Get POL** for gas — you need ~0.5 POL minimum
2. **Bridge USDC to Polygon** as USDC.e:
   - Use the [Polygon Bridge](https://portal.polygon.technology/bridge) or
   - Transfer USDC directly on Polygon from an exchange (Coinbase, Binance, etc.)
3. Send your trading capital ($500+) to your dedicated trading wallet

---

## Step 6: Approve Polymarket Contracts

Before your first trade, run the one-time contract approval (costs ~0.01 POL in gas):

```bash
cd ~/.openclaw/skills/polyclaw
uv run python scripts/polyclaw.py approve
```

This submits 6 approval transactions to Polygon. You only need to do this once per wallet.

---

## Step 7: Test Your Setup

### Check wallet status
```bash
uv run python scripts/polyclaw.py wallet status
```

### Browse trending markets
```bash
uv run python scripts/polyclaw.py markets trending
```

### Search for specific markets
```bash
uv run python scripts/polyclaw.py markets search "bitcoin"
```

### Run a hedge scan (LLM-powered arbitrage detection)
```bash
uv run python scripts/polyclaw.py hedge scan --limit 10
```

---

## Step 8: Start Trading

### Manual trades via CLI
```bash
# Buy $50 YES on a market
uv run python scripts/polyclaw.py buy <market_id> YES 50

# Buy $50 NO on a market
uv run python scripts/polyclaw.py buy <market_id> NO 50

# Check your positions
uv run python scripts/polyclaw.py positions
```

### How trades work under the hood
When you buy a position, PolyClaw:
1. Splits your USDC.e into equal YES and NO tokens
2. Sells the side you don't want via the order book
3. Returns your desired position at the effective market price

### Oracle Gap Arbitrage Mode
Once comfortable with manual trades, you can instruct OpenClaw via your messaging channel:

> "Monitor BTC 5-minute markets on Polymarket. When Binance BTC/USDT moves more than 0.5% in 60 seconds and the corresponding Polymarket odds haven't adjusted, buy the direction the odds should move. Max position size $100."

Opus 4.6 will reason through each opportunity before executing.

---

## Cloudflare / Proxy Note

Polymarket's CLOB API uses Cloudflare protection that blocks POST requests from many IPs (especially datacenter IPs). If you're running on a VPS, you may need a rotating residential proxy (IPRoyal, BrightData, etc.). The CLOB client automatically retries with new IPs until one works.

Configure in `openclaw.json`:
```json
{
  "skills": {
    "entries": {
      "polyclaw": {
        "env": {
          "PROXY_URL": "http://user:pass@proxy.example.com:port"
        }
      }
    }
  }
}
```

---

## Security Checklist

- [ ] **Dedicated wallet only** — never use your main wallet or one with significant holdings
- [ ] **Withdraw regularly** — move profits to a secure wallet frequently
- [ ] **Start small** — even with $500+ budget, begin with $50-100 trades
- [ ] **Sandbox mode** — use `--sandbox` flag when installing any new skills
- [ ] **Audit skills** — review source code of any community skill before installation
- [ ] **No malicious skills** — the "ClawHavoc" campaign planted 341 malicious skills on ClawHub; only use verified, open-source skills
- [ ] **Private key safety** — your private key is stored in `openclaw.json`; secure file permissions (`chmod 600`)
- [ ] **Rate limits** — set hard spending limits to prevent runaway trades
- [ ] **Monitor actively** — don't leave unattended until you trust the setup

---

## Risk Management Settings

Add these to your `openclaw.json` to prevent runaway losses:

```json
{
  "skills": {
    "entries": {
      "polyclaw": {
        "env": {
          "MAX_POSITION_SIZE": "100",
          "MAX_DAILY_VOLUME": "1000",
          "STOP_LOSS_PERCENT": "15",
          "MIN_EDGE_THRESHOLD": "3"
        }
      }
    }
  }
}
```

---

## Useful Resources

- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [PolyClaw GitHub](https://github.com/chainstacklabs/polyclaw)
- [Chainstack Polygon RPC](https://chainstack.com)
- [Polymarket](https://polymarket.com)
- [OpenRouter](https://openrouter.ai)
- [Anthropic Console](https://console.anthropic.com)

---

## Disclaimer

This guide is for educational and experimental purposes only. Trading prediction markets involves substantial risk of loss. Markets can move against you, liquidity can dry up, and forecasts can be wrong. Arbitrage margins are compressing as more bots enter the market. Only trade with funds you can afford to lose. This is not financial advice.

Polymarket trading may be unavailable or restricted in certain jurisdictions, including the United States, United Kingdom, Australia, France, Germany, and 30+ other countries. Verify your local regulations before trading.
