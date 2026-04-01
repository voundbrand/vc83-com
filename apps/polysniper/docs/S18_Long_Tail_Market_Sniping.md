# S18: Long-Tail Market Sniping — Implementation Plan

## The Thesis

80% of Polymarket markets have thin order books. HFT bots ignore them — not enough volume to justify the infrastructure. But these long-tail markets can have massive mispricings because nobody's paying attention. A niche science question, a local election, an obscure cultural event — Opus 4.6 can assess probability on basically any topic.

You don't compete on speed. You compete on knowledge breadth. Place patient limit orders at fair value, wait for them to fill, and collect 10-30% edge per trade. This is the best risk/reward strategy in the entire matrix.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   LONG-TAIL SNIPER                            │
│                                                               │
│  ┌───────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │  Market    │───▶│  Thin Market  │───▶│  Opus 4.6        │  │
│  │  Crawler   │    │  Filter       │    │  Probability     │  │
│  │  (ALL mkts)│    │  (low liq)    │    │  Assessor        │  │
│  └───────────┘    └───────────────┘    └────────┬─────────┘  │
│                                                  │            │
│       ┌───────────────────┐          ┌──────────▼─────────┐  │
│       │  Order Book       │─────────▶│  Limit Order       │  │
│       │  Depth Analyzer   │          │  Placer            │  │
│       └───────────────────┘          └────────┬───────────┘  │
│                                                │              │
│                                     ┌─────────▼───────────┐  │
│                                     │  Position Tracker    │  │
│                                     │  & Exit Manager      │  │
│                                     └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Market Crawler & Thin Market Filter (Day 1)

### What It Does
Crawl ALL active Polymarket markets. Identify the "long tail" — markets with meaningful questions but thin liquidity where mispricing is likely.

### Script: `scripts/longtail_crawler.py`

```python
"""
Crawl all Polymarket markets. Identify long-tail opportunities where:
- Liquidity is thin ($500 - $50K)
- Question is substantive (not spam/joke markets)
- Current prices suggest meaningful uncertainty (not already at 95%+)
- Time to resolution is reasonable (1 week - 6 months)
"""
import requests
import json
from datetime import datetime, timedelta

GAMMA_BASE = "https://gamma-api.polymarket.com"

# Categories where Opus 4.6 has deep domain knowledge
HIGH_KNOWLEDGE_TAGS = [
    "science", "technology", "health", "fda", "legal", "supreme-court",
    "politics", "elections", "economics", "fed", "climate", "ai",
    "space", "education", "international", "trade", "regulation",
    "crypto", "energy", "defense", "immigration"
]

def crawl_all_markets():
    """Pull every active market from Gamma API."""
    markets = []
    offset = 0
    limit = 100

    while True:
        resp = requests.get(
            f"{GAMMA_BASE}/markets",
            params={
                "active": "true",
                "closed": "false",
                "limit": limit,
                "offset": offset,
            }
        )
        batch = resp.json()
        if not batch:
            break
        markets.extend(batch)
        offset += limit

    return markets


def filter_long_tail(markets):
    """
    Filter for the sweet spot: enough liquidity to enter/exit,
    but thin enough that mispricing is likely.
    """
    candidates = []

    for m in markets:
        liq = float(m.get("liquidity", 0) or 0)
        vol = float(m.get("volume", 0) or 0)

        # THE SWEET SPOT: $500 - $50K liquidity
        # Below $500: can't trade meaningfully
        # Above $50K: HFT bots are already watching
        if not (500 <= liq <= 50000):
            continue

        # Parse prices - skip markets already at extreme odds
        prices = m.get("outcomePrices", "")
        if isinstance(prices, str):
            try:
                prices = json.loads(prices)
            except:
                continue

        if not prices or len(prices) < 2:
            continue

        yes_price = float(prices[0])
        no_price = float(prices[1])

        # Skip markets where outcome is already near-certain
        # (< 5% or > 95% — no edge to capture)
        if yes_price < 0.05 or yes_price > 0.95:
            continue

        # Parse end date — skip markets too far out or too close
        end_date_str = m.get("endDate", "")
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
                now = datetime.now(end_date.tzinfo)
                days_to_resolution = (end_date - now).days

                if days_to_resolution < 3 or days_to_resolution > 180:
                    continue
            except:
                pass

        # Score the opportunity
        tags = [t.get("slug", "") if isinstance(t, dict) else str(t) for t in (m.get("tags") or [])]
        tag_match = any(t in HIGH_KNOWLEDGE_TAGS for t in tags)

        # Opportunity score: prefer thin markets with decent volume
        # and tags matching Opus 4.6's knowledge domains
        opp_score = 0
        if liq < 5000:
            opp_score += 3  # Very thin = highest potential edge
        elif liq < 15000:
            opp_score += 2
        else:
            opp_score += 1

        if tag_match:
            opp_score += 2  # Domain knowledge bonus

        # Volume relative to liquidity — high ratio means active interest
        # but thin book (traders want in but there's no depth)
        if vol > 0 and liq > 0:
            vol_liq_ratio = vol / liq
            if vol_liq_ratio > 5:
                opp_score += 2  # High demand, low supply

        candidates.append({
            "id": m["id"],
            "question": m.get("question", ""),
            "slug": m.get("slug", ""),
            "description": m.get("description", ""),
            "yes_price": yes_price,
            "no_price": no_price,
            "liquidity": liq,
            "volume": vol,
            "end_date": end_date_str,
            "tags": tags,
            "tag_match": tag_match,
            "opp_score": opp_score,
            "clob_token_ids": m.get("clobTokenIds", ""),
        })

    # Sort by opportunity score (highest first)
    candidates.sort(key=lambda x: x["opp_score"], reverse=True)
    return candidates


if __name__ == "__main__":
    print("Crawling all active Polymarket markets...")
    all_markets = crawl_all_markets()
    print(f"Total active markets: {len(all_markets)}")

    candidates = filter_long_tail(all_markets)
    print(f"Long-tail candidates: {len(candidates)}")

    with open("longtail_candidates.json", "w") as f:
        json.dump(candidates, f, indent=2)

    # Print top 20
    for i, c in enumerate(candidates[:20]):
        print(f"\n#{i+1} [Score: {c['opp_score']}] {c['question']}")
        print(f"   YES: ${c['yes_price']:.2f}  |  Liquidity: ${c['liquidity']:,.0f}  |  Tags: {c['tags']}")
```

### Key Design Choices
- **$500-$50K liquidity sweet spot**: Below $500, you can't enter/exit. Above $50K, bots are already competing.
- **HIGH_KNOWLEDGE_TAGS**: Categories where Opus 4.6 genuinely has deep expertise. We prioritize these because the model's probability estimates will be more accurate.
- **Opportunity scoring**: Thin liquidity + domain match + high volume/liquidity ratio = highest priority.

---

## Phase 2: Opus 4.6 Probability Assessor (Day 2-3)

### What It Does
For each long-tail candidate, Opus 4.6 generates an independent probability estimate. If its estimate diverges meaningfully from the market price, that's our edge.

### Script: `scripts/probability_assessor.py`

```python
"""
Opus 4.6 generates independent probability estimates for long-tail markets.
The key insight: it doesn't look at the current price first. It forms its own
view, THEN compares to the market. This prevents anchoring bias.
"""
import anthropic
import json

client = anthropic.Anthropic()

ASSESSMENT_PROMPT = """You are a superforecaster — one of the top 2% of
prediction accuracy in forecasting tournaments. Your task is to estimate the
probability of the following prediction market question resolving YES.

CRITICAL: Form your estimate BEFORE looking at any market price. Base it purely
on your knowledge and reasoning.

## Process
1. BASE RATE: What's the historical base rate for this type of event?
2. EVIDENCE FOR: What specific evidence supports YES?
3. EVIDENCE AGAINST: What specific evidence supports NO?
4. UPDATE: Starting from the base rate, how does the specific evidence shift
   the probability?
5. CALIBRATION CHECK: Are you being overconfident? Most people are. Consider
   widening your uncertainty range.

## Output Format (JSON)
{{
  "probability_yes": 0.XX,
  "confidence_in_estimate": 0.XX,
  "base_rate": 0.XX,
  "key_evidence_for": ["evidence 1", "evidence 2"],
  "key_evidence_against": ["evidence 1", "evidence 2"],
  "reasoning": "Brief explanation of your probability estimate",
  "knowledge_depth": "high|medium|low",
  "key_uncertainty": "The single biggest thing you're unsure about"
}}

IMPORTANT:
- probability_yes: Your honest estimate, 0.00 to 1.00
- confidence_in_estimate: How confident you are in YOUR estimate being close
  to the true probability (0.5 = very uncertain, 0.9 = very confident)
- knowledge_depth: Rate how much you actually know about this specific topic
- Be honest about uncertainty. "I don't know" is a valid answer.

---

MARKET QUESTION: {question}
DESCRIPTION: {description}
RESOLUTION DATE: {end_date}
TAGS: {tags}
"""

EDGE_COMPARISON_PROMPT = """Now compare your independent probability estimate
to the current market price.

Your estimate: {model_prob}
Market YES price: {market_price}
Difference: {difference}

Questions:
1. Is the difference large enough to be a real edge, or within noise?
2. What could the market know that you don't?
3. Is there a reason the market might be systematically wrong here?
   (e.g., retail bias, low attention, anchoring on old information)
4. Would you actually bet real money on this divergence?

Output JSON:
{{
  "trade_recommended": true/false,
  "side": "YES" or "NO",
  "edge_estimate_pct": X.X,
  "market_might_know": "What the market could know that you don't",
  "why_market_wrong": "Why you think the market IS wrong (or 'not confident')",
  "conviction": "high|medium|low"
}}
"""

def assess_probability(candidate):
    """Generate independent probability estimate WITHOUT showing market price."""
    prompt = ASSESSMENT_PROMPT.format(
        question=candidate["question"],
        description=candidate.get("description", "No additional description"),
        end_date=candidate.get("end_date", "Unknown"),
        tags=", ".join(candidate.get("tags", [])),
    )

    response = client.messages.create(
        model="claude-opus-4-6-20260214",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    # Parse JSON from response
    text = response.content[0].text
    try:
        # Find JSON block in response
        start = text.index("{")
        end = text.rindex("}") + 1
        assessment = json.loads(text[start:end])
    except (ValueError, json.JSONDecodeError):
        assessment = {"probability_yes": 0.5, "confidence_in_estimate": 0.3,
                       "error": "Failed to parse response", "raw": text[:500]}

    return assessment


def compare_to_market(candidate, assessment):
    """Compare model's estimate to market price and decide whether to trade."""
    model_prob = assessment.get("probability_yes", 0.5)
    market_price = candidate["yes_price"]
    difference = model_prob - market_price

    prompt = EDGE_COMPARISON_PROMPT.format(
        model_prob=f"{model_prob:.2f}",
        market_price=f"{market_price:.2f}",
        difference=f"{difference:+.2f} ({abs(difference)*100:.1f}%)",
    )

    response = client.messages.create(
        model="claude-opus-4-6-20260214",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        comparison = json.loads(text[start:end])
    except (ValueError, json.JSONDecodeError):
        comparison = {"trade_recommended": False, "error": "Parse failed"}

    return comparison


def run_pipeline(candidates, max_analyses=30):
    """
    Run the full pipeline: assess → compare → filter.
    Limit analyses to control API costs (~$0.40 per market).
    """
    signals = []

    for candidate in candidates[:max_analyses]:
        # Step 1: Independent probability estimate
        assessment = assess_probability(candidate)

        # Skip if model has low knowledge depth
        if assessment.get("knowledge_depth") == "low":
            continue

        # Skip if model is very uncertain about its own estimate
        if assessment.get("confidence_in_estimate", 0) < 0.5:
            continue

        # Step 2: Compare to market and decide
        comparison = compare_to_market(candidate, assessment)

        if comparison.get("trade_recommended"):
            signals.append({
                "market_id": candidate["id"],
                "question": candidate["question"],
                "market_yes_price": candidate["yes_price"],
                "model_probability": assessment.get("probability_yes"),
                "model_confidence": assessment.get("confidence_in_estimate"),
                "knowledge_depth": assessment.get("knowledge_depth"),
                "side": comparison.get("side"),
                "edge_pct": comparison.get("edge_estimate_pct"),
                "conviction": comparison.get("conviction"),
                "reasoning": assessment.get("reasoning"),
                "key_uncertainty": assessment.get("key_uncertainty"),
                "liquidity": candidate["liquidity"],
            })

    # Sort by conviction then edge size
    conviction_order = {"high": 3, "medium": 2, "low": 1}
    signals.sort(
        key=lambda x: (conviction_order.get(x.get("conviction", "low"), 0),
                       abs(x.get("edge_pct", 0))),
        reverse=True
    )

    return signals
```

### Why Anti-Anchoring Matters
The assessment prompt deliberately does NOT show the market price. This prevents Opus 4.6 from anchoring on the current odds. It forms an independent view, THEN we compare. Academic forecasting research shows that anchor-free estimates are significantly more accurate for identifying mispricing.

---

## Phase 3: Order Book Analyzer & Limit Order Placer (Day 3-4)

### Script: `scripts/order_placer.py`

```python
"""
Analyze order book depth and place patient limit orders.
In thin markets, market orders get terrible fills. Limit orders are everything.
"""
import json

# Uses polyclaw's underlying CLOB client
# from py_clob_client.client import ClobClient

def analyze_order_book(clob_client, token_id):
    """
    Analyze depth on both sides of the order book.
    Returns: best bid, best ask, spread, depth at various levels.
    """
    book = clob_client.get_order_book(token_id)

    bids = book.get("bids", [])
    asks = book.get("asks", [])

    best_bid = float(bids[0]["price"]) if bids else 0
    best_ask = float(asks[0]["price"]) if asks else 1
    spread = best_ask - best_bid
    spread_pct = (spread / ((best_bid + best_ask) / 2)) * 100 if (best_bid + best_ask) > 0 else 100

    # Depth analysis: how much can we trade at various price levels?
    def depth_at_levels(orders, levels=[0.01, 0.02, 0.05]):
        depth = {}
        for level in levels:
            total = 0
            for order in orders:
                price = float(order["price"])
                size = float(order["size"])
                ref = float(orders[0]["price"]) if orders else 0
                if abs(price - ref) <= level:
                    total += size * price
            depth[f"{level*100:.0f}%"] = round(total, 2)
        return depth

    return {
        "token_id": token_id,
        "best_bid": best_bid,
        "best_ask": best_ask,
        "spread": round(spread, 4),
        "spread_pct": round(spread_pct, 2),
        "bid_depth": depth_at_levels(bids),
        "ask_depth": depth_at_levels(asks),
        "total_bid_depth": sum(float(b["size"]) * float(b["price"]) for b in bids),
        "total_ask_depth": sum(float(a["size"]) * float(a["price"]) for a in asks),
    }


def calculate_limit_price(signal, book_analysis):
    """
    Place limit order at a price that:
    1. Captures most of the edge
    2. Has a reasonable chance of filling
    3. Doesn't move the market against us

    Strategy: Place limit at midpoint between our fair value and market price.
    This gives up some edge for much higher fill probability.
    """
    side = signal["side"]
    model_prob = signal["model_probability"]
    market_price = signal["market_yes_price"]

    if side == "YES":
        # We think YES is underpriced. Buy YES.
        # Place limit between current ask and our fair value
        fair_value = model_prob
        current_ask = book_analysis["best_ask"]
        # Midpoint — gives up ~50% of theoretical edge for fill probability
        limit_price = (current_ask + fair_value) / 2
        # But never pay more than fair value minus minimum edge
        limit_price = min(limit_price, fair_value - 0.02)
    else:
        # We think NO is underpriced (YES is overpriced). Buy NO.
        fair_value = 1 - model_prob
        current_ask_no = 1 - book_analysis["best_bid"]  # NO ask = 1 - YES bid
        limit_price = (current_ask_no + fair_value) / 2
        limit_price = min(limit_price, fair_value - 0.02)

    return round(limit_price, 3)


def place_snipe_order(signal, book_analysis, bankroll=5000):
    """
    Generate the limit order parameters for a long-tail snipe.
    """
    limit_price = calculate_limit_price(signal, book_analysis)

    # Position sizing: smaller in thinner markets
    liquidity = signal.get("liquidity", 1000)
    max_position_pct = min(0.05, liquidity * 0.05 / bankroll)  # Never > 5% of book depth
    position_usd = bankroll * max_position_pct

    # Cap at $200 for thin markets, $500 for medium
    if liquidity < 5000:
        position_usd = min(position_usd, 200)
    else:
        position_usd = min(position_usd, 500)

    shares = position_usd / limit_price if limit_price > 0 else 0

    return {
        "market_id": signal["market_id"],
        "question": signal["question"],
        "side": signal["side"],
        "limit_price": limit_price,
        "position_usd": round(position_usd, 2),
        "shares": round(shares, 2),
        "edge_pct": signal["edge_pct"],
        "conviction": signal["conviction"],
        "order_type": "LIMIT",
        "time_in_force": "GTC",  # Good til cancelled — patient
        "notes": "Long-tail snipe. Patient limit order. Check weekly.",
    }
```

---

## Phase 4: Position Tracker & Exit Manager (Day 4-5)

### Script: `scripts/position_tracker.py`

```python
"""
Track open positions, monitor for exit signals, and manage the portfolio.
Long-tail positions are patient — we check daily, not every second.
"""
import json
from datetime import datetime

def load_positions(filepath="positions.json"):
    try:
        with open(filepath) as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_positions(positions, filepath="positions.json"):
    with open(filepath, "w") as f:
        json.dump(positions, f, indent=2)

def check_exit_conditions(position, current_price):
    """
    Exit when:
    1. Price has moved to capture >70% of our estimated edge
    2. New information changes our thesis
    3. Resolution date is approaching and we want to lock in profits
    4. Stop loss triggered (price moves against us by >2x our edge)
    """
    entry_price = position["entry_price"]
    side = position["side"]
    edge_target = position["edge_pct"] / 100

    if side == "YES":
        pnl_pct = (current_price - entry_price) / entry_price
        target_reached = pnl_pct >= edge_target * 0.7
        stop_triggered = pnl_pct <= -(edge_target * 2)
    else:
        # For NO positions, track based on NO price = 1 - YES price
        no_entry = 1 - entry_price
        no_current = 1 - current_price
        pnl_pct = (no_current - no_entry) / no_entry if no_entry > 0 else 0
        target_reached = pnl_pct >= edge_target * 0.7
        stop_triggered = pnl_pct <= -(edge_target * 2)

    return {
        "pnl_pct": round(pnl_pct * 100, 2),
        "target_reached": target_reached,
        "stop_triggered": stop_triggered,
        "action": "EXIT_PROFIT" if target_reached else
                  "EXIT_STOP" if stop_triggered else "HOLD",
    }


def daily_portfolio_review(positions, price_fetcher):
    """
    Daily review of all open long-tail positions.
    Returns actions to take.
    """
    actions = []

    for pos in positions:
        current_price = price_fetcher(pos["market_id"])
        exit_check = check_exit_conditions(pos, current_price)

        actions.append({
            "market_id": pos["market_id"],
            "question": pos["question"],
            "side": pos["side"],
            "entry_price": pos["entry_price"],
            "current_price": current_price,
            "pnl_pct": exit_check["pnl_pct"],
            "action": exit_check["action"],
            "days_held": (datetime.now() - datetime.fromisoformat(pos["entry_date"])).days,
        })

    return actions
```

---

## Phase 5: OpenClaw Skill Package (Day 5)

### SKILL.md

```yaml
---
name: longtail-sniper
description: >
  Snipe mispriced long-tail Polymarket markets using Opus 4.6 probability
  assessment. Finds thin-liquidity markets where nobody is paying attention,
  generates independent probability estimates, and places patient limit orders
  to capture 10-30% edge per trade.
metadata:
  openclaw:
    version: 1.0.0
    emoji: "🎯"
    requires:
      env:
        - ANTHROPIC_API_KEY
        - CHAINSTACK_NODE
        - POLYCLAW_PRIVATE_KEY
      bins:
        - python3
        - uv
---

# Long-Tail Market Sniper

## Commands

### Find opportunities
```bash
uv run python scripts/longtail_crawler.py
uv run python scripts/probability_assessor.py --candidates longtail_candidates.json
```

### Place orders on confirmed signals
```bash
uv run python scripts/order_placer.py --signals signals.json
```

### Daily portfolio review
```bash
uv run python scripts/position_tracker.py --review
```

## Strategy
This is a PATIENCE strategy. We're not racing anyone. We're finding markets
where the crowd hasn't done the homework, placing limit orders at fair value,
and waiting. Average hold time: 1-4 weeks.
```

---

## Operational Playbook

### Weekly Routine
1. **Monday morning**: Full crawl. Assess top 30 candidates. Place limit orders on confirmed signals.
2. **Daily (5 min)**: Check position tracker. Exit anything that hit target or stop.
3. **Wednesday**: Re-assess any positions held > 2 weeks. Has the thesis changed?
4. **Friday**: Review filled orders from the week. Log results.

### Portfolio Rules
- Maximum 20 open positions at any time
- Maximum $200 per position in thin markets (<$5K liquidity)
- Maximum $500 per position in medium markets ($5K-$50K liquidity)
- Never more than 30% of bankroll deployed in long-tail positions
- Rebalance monthly based on performance data

### Expected Performance
- Trade frequency: 5-15 new positions per week
- Average hold time: 1-4 weeks
- Expected edge per trade: 10-30%
- Expected win rate: 60-70%
- API cost per scan: ~$12 (30 markets × ~$0.40 each)

---

## Expected Timeline

| Day | Milestone |
|-----|-----------|
| 1 | Market crawler + thin market filter working |
| 2-3 | Probability assessor prompt tuned on 20 test markets |
| 3-4 | Order book analyzer + limit order logic complete |
| 4-5 | Position tracker + exit manager complete |
| 5 | OpenClaw skill packaged |
| 6-7 | First live scan + paper trade signals |
| 14 | First real limit orders (small, $50-100) |
| 30 | Scale up if win rate > 55% across 20+ trades |
