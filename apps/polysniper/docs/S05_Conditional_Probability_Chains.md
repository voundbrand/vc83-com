# S05: Conditional Probability Chain Analysis — Implementation Plan

## The Thesis

When the Fed signals a rate decision, that changes recession odds. Changed recession odds change incumbent election odds. Changed election odds change policy market odds. These are 3-4 causal hops. Most traders reprice the first-order effect. Almost nobody traces it to the third or fourth downstream market.

Smaller models lose coherence after two causal hops. Opus 4.6 doesn't. You're systematically harvesting alpha from markets that are stale because traders haven't connected the dots yet.

This is the hardest strategy to build, but it's also the one with the deepest moat — because the barrier to entry is "have a model that can reason across 4 causal links without hallucinating." That's a very short list.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                 CAUSAL CHAIN ANALYZER                             │
│                                                                   │
│  ┌─────────────┐                                                  │
│  │  Upstream    │   ┌────────────────┐   ┌────────────────────┐  │
│  │  Event       │──▶│  Opus 4.6      │──▶│  Downstream Market │  │
│  │  Detector    │   │  Causal Chain  │   │  Scanner           │  │
│  │              │   │  Mapper        │   │                    │  │
│  └─────────────┘   └───────┬────────┘   └─────────┬──────────┘  │
│                             │                       │             │
│               ┌─────────────▼───────────────────────▼──────────┐ │
│               │         Propagation Delay Estimator            │ │
│               │  (How long until downstream markets reprice?)  │ │
│               └─────────────────────┬──────────────────────────┘ │
│                                     │                            │
│               ┌─────────────────────▼──────────────────────────┐ │
│               │         Stale Market Identifier                │ │
│               │  (Which downstream markets HAVEN'T repriced?)  │ │
│               └─────────────────────┬──────────────────────────┘ │
│                                     │                            │
│               ┌─────────────────────▼──────────────────────────┐ │
│               │         Trade Signal Generator                 │ │
│               │  (Position in stale markets before they move)  │ │
│               └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Causal Graph Builder (Day 1-3)

### What It Does
Build a knowledge graph of causal relationships between Polymarket market categories. This is the foundational data structure that everything else depends on.

### Script: `scripts/causal_graph.py`

```python
"""
Build and maintain a causal graph of relationships between Polymarket markets.
Opus 4.6 identifies logically necessary implications (not correlations).

The graph is built once, then updated incrementally as new markets appear.
"""
import anthropic
import json
import requests
from collections import defaultdict

client = anthropic.Anthropic()
GAMMA_BASE = "https://gamma-api.polymarket.com"

# Pre-defined causal domains
# These are the "upstream" event categories that cause cascading effects
UPSTREAM_DOMAINS = {
    "monetary_policy": {
        "keywords": ["fed", "interest rate", "fomc", "rate cut", "rate hike",
                      "quantitative", "monetary policy", "powell"],
        "downstream": ["recession", "inflation", "stock market", "crypto",
                        "housing", "employment", "election"],
    },
    "geopolitics": {
        "keywords": ["war", "invasion", "conflict", "sanctions", "nato",
                      "china", "russia", "iran", "military", "treaty"],
        "downstream": ["oil price", "commodity", "defense", "trade",
                        "election", "inflation", "refugee"],
    },
    "elections": {
        "keywords": ["election", "president", "congress", "senate", "governor",
                      "primary", "nominee", "poll", "vote"],
        "downstream": ["regulation", "tax", "trade policy", "immigration",
                        "climate policy", "crypto regulation", "healthcare"],
    },
    "economic_data": {
        "keywords": ["gdp", "unemployment", "jobs report", "cpi", "inflation",
                      "retail sales", "housing starts", "consumer confidence"],
        "downstream": ["fed", "recession", "stock market", "election",
                        "crypto", "corporate earnings"],
    },
    "tech_regulation": {
        "keywords": ["antitrust", "ai regulation", "tech ban", "section 230",
                      "ftc", "doj", "eu regulation", "digital markets"],
        "downstream": ["tech stock", "ai", "crypto", "social media",
                        "startup", "ipo"],
    },
    "crypto_events": {
        "keywords": ["bitcoin", "ethereum", "sec", "etf approval", "halving",
                      "stablecoin", "defi", "exchange"],
        "downstream": ["crypto price", "regulation", "institutional adoption",
                        "defi tvl", "nft"],
    },
}

GRAPH_BUILDER_PROMPT = """You are a causal reasoning expert. Given two
Polymarket markets, determine if there is a LOGICALLY NECESSARY causal
relationship between them.

CRITICAL RULES:
- Only identify CAUSAL relationships, not mere correlations
- The relationship must be logically necessary, not just "likely"
- Direction matters: A causes B, not A correlates with B
- Specify the DIRECTION and MAGNITUDE of the causal effect
- Be conservative. If unsure, say "no causal relationship"

## Market A (Potential Upstream Cause):
Question: {market_a_question}
Description: {market_a_description}
Current YES Price: {market_a_price}

## Market B (Potential Downstream Effect):
Question: {market_b_question}
Description: {market_b_description}
Current YES Price: {market_b_price}

## Output JSON:
{{
  "causal_relationship": true/false,
  "direction": "A_causes_B" | "B_causes_A" | "bidirectional" | "none",
  "causal_mechanism": "Brief explanation of WHY A causes B",
  "strength": "strong|moderate|weak",
  "lag_estimate": "How long after A moves would B be expected to move?",
  "direction_of_effect": "If A_YES increases, B_YES increases/decreases",
  "confidence": 0.0-1.0,
  "is_correlation_not_causation": true/false,
  "reasoning": "Detailed reasoning for your assessment"
}}
"""

def fetch_markets_by_domain(domain_config):
    """Fetch markets matching a specific causal domain's keywords."""
    markets = []
    for keyword in domain_config["keywords"]:
        resp = requests.get(
            f"{GAMMA_BASE}/markets",
            params={
                "active": "true",
                "closed": "false",
                "limit": 20,
            }
        )
        # Filter client-side by keyword matching in question/description
        for m in resp.json():
            q = (m.get("question", "") + " " + m.get("description", "")).lower()
            if keyword.lower() in q:
                markets.append(m)

    # Deduplicate by market ID
    seen = set()
    unique = []
    for m in markets:
        if m["id"] not in seen:
            seen.add(m["id"])
            unique.append(m)
    return unique


def identify_causal_pairs(upstream_markets, downstream_markets):
    """
    Use Opus 4.6 to identify true causal relationships between market pairs.
    Returns only pairs with confirmed causal links.
    """
    causal_pairs = []

    for up in upstream_markets:
        for down in downstream_markets:
            if up["id"] == down["id"]:
                continue

            prompt = GRAPH_BUILDER_PROMPT.format(
                market_a_question=up.get("question", ""),
                market_a_description=up.get("description", "")[:500],
                market_a_price=up.get("outcomePrices", ["0.5"])[0] if up.get("outcomePrices") else "0.5",
                market_b_question=down.get("question", ""),
                market_b_description=down.get("description", "")[:500],
                market_b_price=down.get("outcomePrices", ["0.5"])[0] if down.get("outcomePrices") else "0.5",
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
                result = json.loads(text[start:end])
            except:
                continue

            if result.get("causal_relationship") and result.get("confidence", 0) >= 0.7:
                if not result.get("is_correlation_not_causation"):
                    causal_pairs.append({
                        "upstream_id": up["id"],
                        "upstream_question": up.get("question", ""),
                        "downstream_id": down["id"],
                        "downstream_question": down.get("question", ""),
                        "mechanism": result.get("causal_mechanism"),
                        "strength": result.get("strength"),
                        "lag_estimate": result.get("lag_estimate"),
                        "direction_of_effect": result.get("direction_of_effect"),
                        "confidence": result.get("confidence"),
                    })

    return causal_pairs


def build_causal_graph():
    """
    Build the full causal graph across all domains.
    This is expensive (~$50-100 in API calls) but only needs to run once,
    then incremental updates for new markets.
    """
    graph = {"nodes": {}, "edges": [], "built_at": "", "version": "1.0"}
    all_pairs = []

    for domain_name, config in UPSTREAM_DOMAINS.items():
        print(f"Processing domain: {domain_name}")
        upstream = fetch_markets_by_domain(config)
        print(f"  Found {len(upstream)} upstream markets")

        # Fetch downstream markets
        downstream = []
        for downstream_keyword in config["downstream"]:
            resp = requests.get(
                f"{GAMMA_BASE}/markets",
                params={"active": "true", "closed": "false", "limit": 10}
            )
            for m in resp.json():
                q = (m.get("question", "") + " " + m.get("description", "")).lower()
                if downstream_keyword.lower() in q:
                    downstream.append(m)

        # Deduplicate
        seen = set()
        downstream_unique = []
        for m in downstream:
            if m["id"] not in seen:
                seen.add(m["id"])
                downstream_unique.append(m)

        print(f"  Found {len(downstream_unique)} downstream markets")

        # Identify causal pairs (limit to prevent API cost explosion)
        # Top 5 upstream × top 10 downstream = max 50 pairs per domain
        pairs = identify_causal_pairs(upstream[:5], downstream_unique[:10])
        all_pairs.extend(pairs)
        print(f"  Identified {len(pairs)} causal relationships")

    graph["edges"] = all_pairs
    graph["built_at"] = str(datetime.now()) if 'datetime' in dir() else "now"

    return graph


if __name__ == "__main__":
    from datetime import datetime
    print("Building causal graph...")
    graph = build_causal_graph()
    print(f"\nTotal causal edges: {len(graph['edges'])}")

    with open("causal_graph.json", "w") as f:
        json.dump(graph, f, indent=2)

    # Print summary
    for edge in graph["edges"]:
        print(f"\n[{edge['strength']}] {edge['upstream_question']}")
        print(f"  └──▶ {edge['downstream_question']}")
        print(f"       Mechanism: {edge['mechanism']}")
        print(f"       Lag: {edge['lag_estimate']}")
```

### Key Design Choices
- **Pre-defined upstream domains**: Instead of checking every pair (N² explosion), we focus on known causal categories
- **Correlation filter**: The prompt explicitly asks "is this correlation, not causation?" — the #1 failure mode of weaker models
- **Confidence threshold**: Only edges with >70% confidence make it into the graph
- **One-time build + incremental**: The initial graph build is expensive but only runs once

---

## Phase 2: Upstream Event Detector (Day 3-4)

### What It Does
Monitors upstream markets in real-time. When an upstream market price moves significantly, it triggers the downstream analysis pipeline.

### Script: `scripts/upstream_monitor.py`

```python
"""
Monitor upstream markets for significant price movements.
When an upstream market moves, check if downstream markets have repriced.
The GAP between "upstream moved" and "downstream repriced" is our profit window.
"""
import requests
import json
import time
from datetime import datetime

GAMMA_BASE = "https://gamma-api.polymarket.com"

def load_causal_graph(filepath="causal_graph.json"):
    with open(filepath) as f:
        return json.load(f)


def get_current_prices(market_ids):
    """Fetch current prices for a list of market IDs."""
    prices = {}
    for mid in market_ids:
        try:
            resp = requests.get(f"{GAMMA_BASE}/markets/{mid}")
            m = resp.json()
            outcome_prices = m.get("outcomePrices", "")
            if isinstance(outcome_prices, str):
                outcome_prices = json.loads(outcome_prices)
            prices[mid] = float(outcome_prices[0]) if outcome_prices else None
        except:
            prices[mid] = None
    return prices


def detect_upstream_movements(graph, price_history, current_prices,
                                threshold_pct=3.0):
    """
    Detect upstream markets that have moved more than threshold_pct
    since last check.
    """
    movements = []
    upstream_ids = set(edge["upstream_id"] for edge in graph["edges"])

    for uid in upstream_ids:
        old_price = price_history.get(uid)
        new_price = current_prices.get(uid)

        if old_price is None or new_price is None:
            continue

        change_pct = ((new_price - old_price) / old_price) * 100 if old_price > 0 else 0

        if abs(change_pct) >= threshold_pct:
            movements.append({
                "market_id": uid,
                "old_price": old_price,
                "new_price": new_price,
                "change_pct": round(change_pct, 2),
                "direction": "UP" if change_pct > 0 else "DOWN",
                "detected_at": datetime.now().isoformat(),
            })

    return movements


def find_stale_downstream(graph, movement, current_prices, price_history):
    """
    Given an upstream movement, find downstream markets that HAVEN'T
    repriced yet. These are our trade targets.
    """
    stale_targets = []

    # Find all downstream markets connected to this upstream
    downstream_edges = [
        e for e in graph["edges"]
        if e["upstream_id"] == movement["market_id"]
    ]

    for edge in downstream_edges:
        did = edge["downstream_id"]
        old_down_price = price_history.get(did)
        new_down_price = current_prices.get(did)

        if old_down_price is None or new_down_price is None:
            continue

        down_change_pct = ((new_down_price - old_down_price) / old_down_price) * 100 if old_down_price > 0 else 0

        # Is the downstream market STALE?
        # Upstream moved significantly, but downstream barely moved
        is_stale = abs(down_change_pct) < abs(movement["change_pct"]) * 0.3

        if is_stale:
            # Determine expected direction of downstream movement
            upstream_direction = movement["direction"]
            effect_direction = edge.get("direction_of_effect", "")

            if "increases" in effect_direction.lower():
                expected_down_direction = upstream_direction
            elif "decreases" in effect_direction.lower():
                expected_down_direction = "DOWN" if upstream_direction == "UP" else "UP"
            else:
                expected_down_direction = "UNKNOWN"

            stale_targets.append({
                "downstream_id": did,
                "downstream_question": edge["downstream_question"],
                "current_down_price": new_down_price,
                "down_change_pct": round(down_change_pct, 2),
                "upstream_change_pct": movement["change_pct"],
                "expected_direction": expected_down_direction,
                "causal_mechanism": edge["mechanism"],
                "causal_strength": edge["strength"],
                "lag_estimate": edge["lag_estimate"],
                "staleness_ratio": round(abs(down_change_pct) / abs(movement["change_pct"]), 3) if movement["change_pct"] != 0 else 0,
            })

    # Sort by staleness (most stale first = biggest opportunity)
    stale_targets.sort(key=lambda x: x["staleness_ratio"])
    return stale_targets


def monitoring_loop(graph, check_interval=300):
    """
    Main monitoring loop. Checks every 5 minutes (configurable).
    In production, this would be triggered by webhooks or websockets.
    """
    all_market_ids = set()
    for edge in graph["edges"]:
        all_market_ids.add(edge["upstream_id"])
        all_market_ids.add(edge["downstream_id"])

    # Initialize price history
    print(f"Monitoring {len(all_market_ids)} markets across causal graph...")
    price_history = get_current_prices(all_market_ids)

    while True:
        time.sleep(check_interval)

        current_prices = get_current_prices(all_market_ids)
        movements = detect_upstream_movements(graph, price_history, current_prices)

        if movements:
            print(f"\n{'='*60}")
            print(f"UPSTREAM MOVEMENT DETECTED at {datetime.now()}")
            for m in movements:
                print(f"  {m['direction']} {m['change_pct']:+.1f}% — {m['market_id']}")

                stale = find_stale_downstream(graph, m, current_prices, price_history)
                if stale:
                    print(f"  STALE DOWNSTREAM MARKETS:")
                    for s in stale:
                        print(f"    → {s['downstream_question']}")
                        print(f"      Price change: {s['down_change_pct']:+.1f}% "
                              f"(expected more, staleness: {s['staleness_ratio']:.2f})")
                        print(f"      Direction: {s['expected_direction']}")
                        print(f"      Mechanism: {s['causal_mechanism']}")

        # Update price history
        price_history = current_prices
```

---

## Phase 3: Propagation Delay Estimator (Day 4-5)

### Script: `scripts/propagation_estimator.py`

```python
"""
Estimate how long it takes for upstream market movements to propagate
to downstream markets. This determines our trade window.

Uses Opus 4.6 to assess:
1. How quickly should this causal effect propagate?
2. Is the downstream market GENUINELY stale or deliberately discounting?
3. What's our confidence that the downstream WILL reprice?
"""
import anthropic
import json

client = anthropic.Anthropic()

PROPAGATION_PROMPT = """You are a market microstructure expert analyzing
information propagation between prediction markets.

An upstream market has moved significantly:
- Upstream: {upstream_question}
- Upstream move: {upstream_change_pct:+.1f}% (YES price: {upstream_old} → {upstream_new})

A causally connected downstream market has NOT repriced:
- Downstream: {downstream_question}
- Downstream move: {downstream_change_pct:+.1f}% (barely moved)
- Causal mechanism: {mechanism}
- Historical lag estimate: {lag_estimate}

## Questions:

1. SHOULD the downstream market reprice based on this upstream move?
   Or is the market correctly discounting the causal link?

2. If yes, HOW MUCH should the downstream reprice?
   (estimate the fair price change in percentage points)

3. WHY hasn't it repriced yet? Choose the most likely reason:
   a) Low attention / thin liquidity (traders haven't noticed)
   b) Market is correctly discounting (the causal link is weaker than it appears)
   c) Counterbalancing factors (other news offsetting the effect)
   d) Temporal lag (it will reprice, just hasn't had time yet)
   e) Different trader base (upstream traders ≠ downstream traders)

4. WHEN do you expect the downstream to reprice?
   (minutes / hours / days / never)

5. What's your CONFIDENCE that this is a profitable trade?
   (0-100%)

## Output JSON:
{{
  "should_reprice": true/false,
  "expected_downstream_change_pct": X.X,
  "expected_direction": "YES_UP" | "YES_DOWN",
  "reason_not_repriced": "a|b|c|d|e",
  "expected_reprice_time": "X minutes|hours|days",
  "trade_confidence": 0-100,
  "trade_recommended": true/false,
  "risk_factors": ["factor 1", "factor 2"],
  "reasoning": "Detailed reasoning"
}}
"""

def estimate_propagation(stale_target, upstream_movement, upstream_question):
    """Assess whether a stale downstream market represents a real opportunity."""
    prompt = PROPAGATION_PROMPT.format(
        upstream_question=upstream_question,
        upstream_change_pct=upstream_movement["change_pct"],
        upstream_old=upstream_movement["old_price"],
        upstream_new=upstream_movement["new_price"],
        downstream_question=stale_target["downstream_question"],
        downstream_change_pct=stale_target["down_change_pct"],
        mechanism=stale_target["causal_mechanism"],
        lag_estimate=stale_target["lag_estimate"],
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
        return json.loads(text[start:end])
    except:
        return {"trade_recommended": False, "error": "Parse failed"}


def generate_chain_trade_signal(stale_target, propagation_estimate, bankroll=5000):
    """Generate a trade signal from a confirmed stale downstream market."""
    if not propagation_estimate.get("trade_recommended"):
        return None

    confidence = propagation_estimate.get("trade_confidence", 0)
    if confidence < 60:
        return None

    expected_change = propagation_estimate.get("expected_downstream_change_pct", 0)
    direction = propagation_estimate.get("expected_direction", "")

    if abs(expected_change) < 2:
        return None

    side = "YES" if "UP" in direction else "NO"

    # Position sizing based on confidence and expected magnitude
    base_size = bankroll * 0.03  # 3% of bankroll base
    confidence_multiplier = confidence / 100
    magnitude_multiplier = min(abs(expected_change) / 5, 2.0)

    position_usd = base_size * confidence_multiplier * magnitude_multiplier
    position_usd = min(position_usd, 500)  # Hard cap
    position_usd = max(position_usd, 25)   # Minimum trade size

    return {
        "market_id": stale_target["downstream_id"],
        "question": stale_target["downstream_question"],
        "side": side,
        "position_usd": round(position_usd, 2),
        "expected_change_pct": expected_change,
        "confidence": confidence,
        "causal_mechanism": stale_target["causal_mechanism"],
        "expected_reprice_time": propagation_estimate.get("expected_reprice_time"),
        "reason_stale": propagation_estimate.get("reason_not_repriced"),
        "risk_factors": propagation_estimate.get("risk_factors", []),
        "order_type": "LIMIT",  # Still use limit orders for better fills
    }
```

---

## Phase 4: Multi-Hop Chain Analyzer (Day 5-7)

### What It Does
This is the secret weapon. Instead of single-hop causation (A→B), trace chains 3-4 levels deep (A→B→C→D). This is where Opus 4.6's reasoning dominance matters most.

### Script: `scripts/multi_hop_analyzer.py`

```python
"""
Trace multi-hop causal chains through the graph.
A→B→C→D analysis — where Opus 4.6 has a categorical advantage
over smaller models that lose coherence after 2 hops.
"""
import anthropic
import json

client = anthropic.Anthropic()

MULTI_HOP_PROMPT = """You are a systems-thinking expert analyzing cascading
effects through prediction markets.

An upstream event has occurred (or is likely to occur):
{upstream_event}

## Causal Chain to Analyze:
{chain_description}

## Your Task:
Trace the causal chain through each hop. For EACH hop, assess:
1. Probability that this hop's effect materializes
2. Magnitude of the effect (how many % points does the next market move?)
3. Time lag before the effect is felt
4. What could break the chain at this point?

Then, for the FINAL downstream market:
1. What is the cumulative effect? (compound the probabilities)
2. Is the final market currently priced correctly given the upstream event?
3. If mispriced, by how much and in which direction?

CRITICAL: Be honest about uncertainty compounding. Each hop multiplies
uncertainty. A 4-hop chain with 80% confidence at each hop is only
80%^4 = 41% confident overall. Don't pretend you're more certain than
the math allows.

## Output JSON:
{{
  "chain_hops": [
    {{
      "from_market": "...",
      "to_market": "...",
      "hop_probability": 0.XX,
      "effect_magnitude_pct": X.X,
      "time_lag": "...",
      "chain_breaker": "What could prevent this hop"
    }}
  ],
  "cumulative_probability": 0.XX,
  "final_market_current_price": 0.XX,
  "final_market_fair_price": 0.XX,
  "mispricing_pct": X.X,
  "trade_recommended": true/false,
  "side": "YES|NO",
  "confidence": 0-100,
  "key_risk": "The single biggest thing that could go wrong",
  "reasoning": "Full chain reasoning"
}}
"""

def find_multi_hop_chains(graph, max_hops=4):
    """
    Traverse the causal graph to find chains of length 2-4.
    Returns chains as lists of edges.
    """
    edges_by_upstream = {}
    for edge in graph["edges"]:
        uid = edge["upstream_id"]
        if uid not in edges_by_upstream:
            edges_by_upstream[uid] = []
        edges_by_upstream[uid].append(edge)

    chains = []

    # BFS to find all chains of length 2-4
    for edge in graph["edges"]:
        # Start a chain from each edge
        chain = [edge]
        extend_chain(chain, edges_by_upstream, chains, max_hops)

    return chains


def extend_chain(current_chain, edges_by_upstream, all_chains, max_hops):
    """Recursively extend a causal chain."""
    last_downstream = current_chain[-1]["downstream_id"]

    if len(current_chain) >= 2:
        all_chains.append(list(current_chain))

    if len(current_chain) >= max_hops:
        return

    # Find edges that continue from the last downstream
    next_edges = edges_by_upstream.get(last_downstream, [])
    for next_edge in next_edges:
        # Avoid cycles
        visited = set(e["downstream_id"] for e in current_chain)
        visited.add(current_chain[0]["upstream_id"])
        if next_edge["downstream_id"] not in visited:
            current_chain.append(next_edge)
            extend_chain(current_chain, edges_by_upstream, all_chains, max_hops)
            current_chain.pop()


def analyze_chain(chain, current_prices):
    """Use Opus 4.6 to analyze a full multi-hop causal chain."""
    chain_desc = ""
    for i, edge in enumerate(chain):
        arrow = "→" if i < len(chain) - 1 else ""
        chain_desc += f"\nHop {i+1}: [{edge['upstream_question']}] → [{edge['downstream_question']}]"
        chain_desc += f"\n  Mechanism: {edge['mechanism']}"
        chain_desc += f"\n  Strength: {edge['strength']}"
        chain_desc += f"\n  Historical lag: {edge['lag_estimate']}"

    upstream_event = f"Market: {chain[0]['upstream_question']}"
    up_price = current_prices.get(chain[0]["upstream_id"], "unknown")
    upstream_event += f"\nCurrent YES price: {up_price}"

    prompt = MULTI_HOP_PROMPT.format(
        upstream_event=upstream_event,
        chain_description=chain_desc,
    )

    response = client.messages.create(
        model="claude-opus-4-6-20260214",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return json.loads(text[start:end])
    except:
        return {"trade_recommended": False, "error": "Parse failed"}


def find_best_chain_trades(graph, current_prices, max_chains=20):
    """
    Find the most promising multi-hop chain trades.
    Rank by: mispricing size × confidence × chain strength.
    """
    chains = find_multi_hop_chains(graph)
    print(f"Found {len(chains)} multi-hop chains (2-4 hops)")

    # Prioritize: longer chains (more hops = less competition)
    # and chains with strong causal links
    chains.sort(key=lambda c: (
        len(c),  # Longer chains first
        sum(1 for e in c if e["strength"] == "strong"),  # More strong links
    ), reverse=True)

    results = []
    for chain in chains[:max_chains]:
        analysis = analyze_chain(chain, current_prices)
        if analysis.get("trade_recommended") and analysis.get("confidence", 0) >= 50:
            results.append({
                "chain_length": len(chain),
                "chain_summary": " → ".join(
                    e["upstream_question"][:40] for e in chain
                ) + " → " + chain[-1]["downstream_question"][:40],
                "analysis": analysis,
            })

    results.sort(
        key=lambda x: abs(x["analysis"].get("mispricing_pct", 0)) * x["analysis"].get("confidence", 0),
        reverse=True
    )

    return results
```

---

## Phase 5: OpenClaw Skill Package (Day 7-8)

### SKILL.md

```yaml
---
name: causal-chain-analyzer
description: >
  Trace multi-hop causal chains across Polymarket markets. When an upstream
  event moves (Fed decision, geopolitical event, economic data), identify
  downstream markets that haven't repriced yet. Uses Opus 4.6 for 3-4 hop
  causal reasoning where smaller models lose coherence.
metadata:
  openclaw:
    version: 1.0.0
    emoji: "🔗"
    requires:
      env:
        - ANTHROPIC_API_KEY
        - CHAINSTACK_NODE
        - POLYCLAW_PRIVATE_KEY
      bins:
        - python3
        - uv
---

# Causal Chain Analyzer

## Commands

### Build the causal graph (one-time, ~$50-100 API cost)
```bash
uv run python scripts/causal_graph.py
```

### Start monitoring for upstream movements
```bash
uv run python scripts/upstream_monitor.py --interval 300
```

### Analyze multi-hop chains on demand
```bash
uv run python scripts/multi_hop_analyzer.py --graph causal_graph.json
```

### Full pipeline: detect movement → find stale markets → generate signals
```bash
uv run python scripts/upstream_monitor.py --auto-trade --max-position 200
```

## How It Works
1. Builds a causal graph of market relationships using Opus 4.6
2. Monitors upstream markets every 5 minutes
3. When upstream moves >3%, checks if downstream markets have repriced
4. For stale downstream markets, estimates propagation delay
5. For multi-hop chains (A→B→C→D), analyzes cumulative effects
6. Generates trade signals with position sizing

## The Edge
Smaller models lose coherence after 2 causal hops. Opus 4.6 maintains
logical consistency across 3-4 hops. This means:
- 2-hop opportunities: competitive (other LLM traders can find these)
- 3-hop opportunities: low competition
- 4-hop opportunities: essentially zero competition
```

---

## Operational Playbook

### Setup Phase (Week 1)
1. Build the initial causal graph (one-time)
2. Review and prune false edges manually
3. Paper trade all signals for 1 week

### Monitoring Phase (Ongoing)
1. Run upstream monitor continuously (5-min intervals)
2. When signal fires, review before trading (first 2 weeks)
3. After 2 weeks of positive paper trading, enable live trading with small sizes

### Event Calendar Integration
The biggest opportunities come around scheduled events:

| Event Type | Frequency | Typical Chain Depth | Expected Opportunity |
|---|---|---|---|
| FOMC Decision | 8x/year | 3-4 hops | High |
| Jobs Report | Monthly | 2-3 hops | Medium |
| CPI Release | Monthly | 2-3 hops | Medium |
| Earnings Season | Quarterly | 2-3 hops | Medium |
| Geopolitical Events | Irregular | 3-4 hops | Very High |
| Court Rulings | Irregular | 2-4 hops | High |

### Cost Budget
- Causal graph build: ~$50-100 (one-time)
- Causal graph update (new markets): ~$5-10/week
- Per-signal analysis: ~$0.50-1.00
- Monitoring (prices only): Free (Gamma API)
- Estimated monthly: $50-100 in API costs

---

## Expected Timeline

| Day | Milestone |
|-----|-----------|
| 1-3 | Causal graph builder working + initial graph built |
| 3-4 | Upstream monitor + stale market detector working |
| 4-5 | Propagation estimator integrated |
| 5-7 | Multi-hop chain analyzer complete |
| 7-8 | OpenClaw skill packaged |
| 8-14 | Paper trading all signals |
| 14-21 | Live trading with small positions ($50-100) |
| 30 | Scale up if chain signals show >55% accuracy |

---

## Key Risk: Uncertainty Compounding

The honest truth about multi-hop chains: each hop multiplies uncertainty.

| Hops | If 80% per hop | If 70% per hop | If 60% per hop |
|------|---------------|---------------|---------------|
| 2 | 64% | 49% | 36% |
| 3 | 51% | 34% | 22% |
| 4 | 41% | 24% | 13% |

This means 4-hop chains with 70% per-hop confidence are only 24% confident overall. The prompt explicitly forces Opus 4.6 to acknowledge this — but you should size positions accordingly. Longer chains = smaller positions.

The trade-off: competition is inversely proportional to chain length. 4-hop opportunities are effectively uncontested, but you need larger position counts to overcome the lower per-trade accuracy.
