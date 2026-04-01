#!/bin/bash
# ============================================
# OpenClaw + PolyClaw Quick Start Commands
# Oracle Gap Arbitrage on Polymarket
# ============================================

# ---- STEP 1: Install OpenClaw ----
npm install -g openclaw@latest
openclaw onboard --install-daemon

# ---- STEP 2: Install PolyClaw Skill ----
clawhub install polyclaw
cd ~/.openclaw/skills/polyclaw
uv sync

# ---- STEP 3: Copy config template ----
# Edit the template with your actual keys before copying!
# cp openclaw-config-template.json ~/.openclaw/openclaw.json

# ---- STEP 4: Approve Polymarket contracts (one-time) ----
cd ~/.openclaw/skills/polyclaw
uv run python scripts/polyclaw.py approve

# ---- STEP 5: Verify setup ----
uv run python scripts/polyclaw.py wallet status
uv run python scripts/polyclaw.py markets trending

# ---- TRADING COMMANDS ----
# Browse markets
# uv run python scripts/polyclaw.py markets trending
# uv run python scripts/polyclaw.py markets search "bitcoin"

# Hedge scan (LLM-powered arbitrage detection)
# uv run python scripts/polyclaw.py hedge scan --limit 10

# Execute trades
# uv run python scripts/polyclaw.py buy <market_id> YES 50
# uv run python scripts/polyclaw.py buy <market_id> NO 50

# Check positions
# uv run python scripts/polyclaw.py positions

echo "Setup complete! Edit openclaw-config-template.json with your keys, then copy to ~/.openclaw/openclaw.json"
