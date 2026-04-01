# PolySniper

Opus 4.6-powered Polymarket arbitrage engine. Three strategies, zero dependencies on OpenClaw.

## Strategies

| ID | Strategy | Edge Source | Competition |
|----|----------|-------------|-------------|
| S12 | Resolution Criteria Exploitation | Opus 4.6 reads resolution rules like a lawyer | Near zero |
| S18 | Long-Tail Market Sniping | Independent probability on thin markets HFT bots ignore | Very low |
| S05 | Conditional Probability Chains | Multi-hop causal reasoning (3-4 hops deep) | Zero |

## Quick Start

```bash
# 1. Clone into your dedicated user account (see SECURITY.md)
cd ~/polysniper

# 2. Copy and fill in your credentials
cp .env.example .env
chmod 600 .env
nano .env

# 3. Run with Docker (recommended — sandboxed)
docker compose build
docker compose run sniper s12            # S12 scan (paper mode)
docker compose run sniper s18            # S18 scan (paper mode)
docker compose run sniper --mode live s12  # LIVE mode (real money!)
docker compose run sniper status         # Portfolio status

# OR run directly with Python
pip install -e .
polysniper s12
polysniper s18
polysniper s05 --build-graph
polysniper monitor --strategies s12,s18 --interval 300
```

## Commands

```
polysniper s12 [--limit 50]                     Scan for resolution criteria mispricing
polysniper s18 [--limit 30]                     Scan long-tail markets for mispricings
polysniper s05 --build-graph                    Build causal relationship graph (~$50-100 API)
polysniper s05 --analyze-chains                 Analyze multi-hop chain opportunities
polysniper monitor --strategies s12,s18         Continuous monitoring loop
polysniper status                               Portfolio status & paper trades
```

## Architecture

```
polysniper/
├── engine/
│   ├── market_client.py    Polymarket Gamma API + CLOB wrapper
│   ├── brain.py            Opus 4.6 reasoning engine (dual-analysis pattern)
│   ├── risk.py             Position sizing, daily limits, kill switches
│   └── trader.py           Order execution (paper + live modes)
├── strategies/
│   ├── s12_resolution.py   Resolution criteria exploitation
│   ├── s18_longtail.py     Long-tail market sniping
│   └── s05_chains.py       Conditional probability chains
├── config.py               Central config from .env
├── logger.py               Structured logging (rich + JSON audit)
└── cli.py                  Click CLI entry point
```

## Risk Controls

All trades go through the risk manager before execution:

- **Minimum edge**: 3% (configurable via MIN_EDGE_PCT)
- **Minimum confidence**: 70% (configurable via MIN_CONFIDENCE)
- **Max position**: $200 default (configurable via MAX_POSITION_USD)
- **Max daily volume**: $1,000 (configurable via MAX_DAILY_VOLUME_USD)
- **Max bankroll %**: 10% per position
- **Half-Kelly sizing**: Conservative position sizing
- **Dual analysis**: Two Opus 4.6 passes (one adversarial) before any trade signal
- **Paper mode default**: No real money until you explicitly use --mode live

## Security Setup

See SECURITY.md for the full sandboxing guide:

1. Dedicated macOS user account
2. Docker containerization with read-only filesystem
3. Network firewall (only approved API endpoints)
4. Separate prepaid funding card
5. Dedicated Polygon wallet (never your main wallet)
6. API spend limits on Anthropic account

## Cost Estimates

| Operation | Cost |
|-----------|------|
| S12 scan (50 markets) | ~$15-30 |
| S18 scan (30 markets) | ~$12-20 |
| S05 graph build (one-time) | ~$50-100 |
| S05 monitoring (per signal) | ~$0.50-1.00 |
| Daily running cost | ~$20-50 |

## Disclaimer

This software is for educational and experimental purposes. Not financial advice. Trading prediction markets involves substantial risk of loss. Only use funds you can afford to lose. Polymarket may be restricted in your jurisdiction.
