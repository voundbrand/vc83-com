"""S05: Conditional Probability Chain Analysis — trace multi-hop causal effects
across markets and trade downstream markets that haven't repriced."""
import json
import time
from pathlib import Path
from datetime import datetime

from polysniper.engine.market_client import MarketClient
from polysniper.engine.brain import Brain
from polysniper.engine.risk import RiskManager
from polysniper.config import cfg
from polysniper.logger import log

UPSTREAM_DOMAINS = {
    "monetary_policy": {
        "keywords": ["fed", "interest rate", "fomc", "rate cut", "rate hike", "powell"],
        "downstream_keywords": ["recession", "inflation", "stock market", "crypto", "housing", "employment", "election"],
    },
    "geopolitics": {
        "keywords": ["war", "invasion", "conflict", "sanctions", "nato", "china", "russia", "iran"],
        "downstream_keywords": ["oil", "commodity", "defense", "trade", "election", "inflation", "refugee"],
    },
    "elections": {
        "keywords": ["election", "president", "congress", "senate", "governor", "primary", "nominee"],
        "downstream_keywords": ["regulation", "tax", "trade policy", "immigration", "climate policy", "crypto regulation"],
    },
    "economic_data": {
        "keywords": ["gdp", "unemployment", "jobs report", "cpi", "inflation", "retail sales"],
        "downstream_keywords": ["fed", "recession", "stock market", "election", "crypto"],
    },
    "crypto_events": {
        "keywords": ["bitcoin", "ethereum", "sec", "etf", "halving", "stablecoin"],
        "downstream_keywords": ["crypto price", "regulation", "defi", "institutional"],
    },
}

SYSTEM_PROMPT = """You are a causal reasoning expert who traces cascading effects
through interconnected prediction markets. You distinguish true causation from
mere correlation. You are honest about uncertainty compounding across multiple
causal hops."""

CAUSAL_LINK_PROMPT = """Determine if there is a LOGICALLY NECESSARY causal
relationship between these two markets. Only causation, not correlation.

Market A (potential cause):
  Question: {a_question}
  YES Price: {a_price}

Market B (potential effect):
  Question: {b_question}
  YES Price: {b_price}

Output JSON:
{{
  "causal": true/false,
  "direction": "A_causes_B|B_causes_A|none",
  "mechanism": "Why A causes B",
  "strength": "strong|moderate|weak",
  "lag": "minutes|hours|days|weeks",
  "effect_direction": "If A_YES increases, B_YES increases|decreases",
  "confidence": 0.0-1.0,
  "is_mere_correlation": true/false
}}
"""

PROPAGATION_PROMPT = """An upstream market just moved significantly:
  Market: {upstream_question}
  Move: {change_pct:+.1f}% (was {old_price:.2f}, now {new_price:.2f})

A causally linked downstream market has NOT repriced:
  Market: {downstream_question}
  Current price: {down_price:.2f} (barely moved)
  Causal mechanism: {mechanism}

Should the downstream reprice? By how much? When?

Output JSON:
{{
  "should_reprice": true/false,
  "expected_change_pct": X.X,
  "expected_direction": "YES_UP|YES_DOWN",
  "reason_stale": "low_attention|correctly_discounting|counterbalancing|temporal_lag|different_traders",
  "reprice_window": "X minutes|hours|days",
  "trade_confidence": 0-100,
  "trade_recommended": true/false,
  "risk_factors": ["..."]
}}
"""

MULTI_HOP_PROMPT = """Trace this causal chain through prediction markets.
For each hop, assess probability, magnitude, and time lag.
Be honest about uncertainty compounding.

UPSTREAM EVENT:
{upstream_event}

CAUSAL CHAIN:
{chain_description}

Output JSON:
{{
  "hops": [
    {{"from": "...", "to": "...", "hop_prob": 0.XX, "effect_pct": X.X, "lag": "..."}}
  ],
  "cumulative_probability": 0.XX,
  "final_market_fair_price": 0.XX,
  "mispricing_pct": X.X,
  "trade_recommended": true/false,
  "side": "YES|NO",
  "confidence": 0-100,
  "key_risk": "..."
}}
"""


class CausalGraph:
    """Manages the causal relationship graph between markets."""

    def __init__(self, path: str = None):
        self.path = Path(path or f"{cfg.data_dir}/causal_graph.json")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.edges: list[dict] = []
        self._load()

    def _load(self):
        if self.path.exists():
            with open(self.path) as f:
                data = json.load(f)
                self.edges = data.get("edges", [])

    def save(self):
        with open(self.path, "w") as f:
            json.dump({
                "edges": self.edges,
                "updated_at": datetime.utcnow().isoformat(),
                "edge_count": len(self.edges),
            }, f, indent=2)

    def add_edge(self, edge: dict):
        self.edges.append(edge)

    def get_downstream(self, upstream_id: str) -> list[dict]:
        return [e for e in self.edges if e["upstream_id"] == upstream_id]

    def get_upstream_ids(self) -> set[str]:
        return {e["upstream_id"] for e in self.edges}

    def get_all_ids(self) -> set[str]:
        ids = set()
        for e in self.edges:
            ids.add(e["upstream_id"])
            ids.add(e["downstream_id"])
        return ids

    def find_chains(self, max_hops: int = 4) -> list[list[dict]]:
        """Find all multi-hop chains (length 2-4) via BFS."""
        by_upstream = {}
        for e in self.edges:
            by_upstream.setdefault(e["upstream_id"], []).append(e)

        chains = []
        for edge in self.edges:
            self._extend([edge], by_upstream, chains, max_hops)
        return chains

    def _extend(self, chain, by_upstream, all_chains, max_hops):
        last_down = chain[-1]["downstream_id"]
        if len(chain) >= 2:
            all_chains.append(list(chain))
        if len(chain) >= max_hops:
            return
        visited = {e["downstream_id"] for e in chain} | {chain[0]["upstream_id"]}
        for next_edge in by_upstream.get(last_down, []):
            if next_edge["downstream_id"] not in visited:
                chain.append(next_edge)
                self._extend(chain, by_upstream, all_chains, max_hops)
                chain.pop()


class S05Scanner:
    """Build causal graph, monitor upstream, find stale downstream markets."""

    def __init__(self):
        self.client = MarketClient()
        self.brain = Brain()
        self.risk = RiskManager()
        self.graph = CausalGraph()

    def build_graph(self, max_pairs_per_domain: int = 30) -> CausalGraph:
        """Build the causal graph across all upstream domains. One-time operation."""
        log.info("[S05] Building causal graph...")

        for domain_name, domain_cfg in UPSTREAM_DOMAINS.items():
            log.info(f"[S05] Processing domain: {domain_name}")

            upstream_markets = self._search_markets(domain_cfg["keywords"], limit=5)
            downstream_markets = self._search_markets(domain_cfg["downstream_keywords"], limit=10)

            log.info(f"[S05]   {len(upstream_markets)} upstream, {len(downstream_markets)} downstream")

            pairs_checked = 0
            for up in upstream_markets:
                for down in downstream_markets:
                    if up["id"] == down["id"]:
                        continue
                    if pairs_checked >= max_pairs_per_domain:
                        break

                    result = self.brain.analyze_json(
                        prompt=CAUSAL_LINK_PROMPT.format(
                            a_question=up["question"],
                            a_price=up.get("yes_price", "?"),
                            b_question=down["question"],
                            b_price=down.get("yes_price", "?"),
                        ),
                        system=SYSTEM_PROMPT,
                    )
                    pairs_checked += 1

                    if result and result.get("causal") and not result.get("is_mere_correlation"):
                        if result.get("confidence", 0) >= 0.7:
                            self.graph.add_edge({
                                "upstream_id": up["id"],
                                "upstream_question": up["question"],
                                "downstream_id": down["id"],
                                "downstream_question": down["question"],
                                "mechanism": result.get("mechanism", ""),
                                "strength": result.get("strength", ""),
                                "lag": result.get("lag", ""),
                                "effect_direction": result.get("effect_direction", ""),
                                "confidence": result.get("confidence", 0),
                            })
                            log.info(
                                f"[S05]   EDGE: {up['question'][:40]} → {down['question'][:40]} "
                                f"({result.get('strength')})"
                            )

        self.graph.save()
        log.info(f"[S05] Graph built: {len(self.graph.edges)} causal edges")
        log.info(f"[S05] API cost: ${self.brain.estimate_cost()['estimated_cost_usd']:.2f}")
        return self.graph

    def monitor_once(self, price_history: dict[str, float]) -> list[dict]:
        """
        Single monitoring pass: check upstream for movements,
        find stale downstream markets, generate signals.
        """
        if not self.graph.edges:
            log.warning("[S05] No causal graph loaded. Run build_graph first.")
            return []

        all_ids = self.graph.get_all_ids()
        current_prices = self.client.get_prices_batch(list(all_ids))

        # Detect upstream movements (>3% change)
        movements = []
        for uid in self.graph.get_upstream_ids():
            old = price_history.get(uid)
            new = current_prices.get(uid)
            if old is None or new is None or old == 0:
                continue
            change_pct = ((new - old) / old) * 100
            if abs(change_pct) >= 3.0:
                movements.append({
                    "market_id": uid,
                    "old_price": old,
                    "new_price": new,
                    "change_pct": round(change_pct, 2),
                })

        if not movements:
            return []

        log.info(f"[S05] {len(movements)} upstream movements detected")

        signals = []
        for movement in movements:
            downstream_edges = self.graph.get_downstream(movement["market_id"])

            for edge in downstream_edges:
                did = edge["downstream_id"]
                old_down = price_history.get(did)
                new_down = current_prices.get(did)
                if old_down is None or new_down is None or old_down == 0:
                    continue

                down_change = ((new_down - old_down) / old_down) * 100
                # Is downstream stale? (moved less than 30% of upstream move)
                if abs(down_change) >= abs(movement["change_pct"]) * 0.3:
                    continue

                # Assess propagation with Opus 4.6
                up_market = self.client.fetch_market(movement["market_id"])
                prop = self.brain.analyze_json(
                    prompt=PROPAGATION_PROMPT.format(
                        upstream_question=up_market["question"] if up_market else edge["upstream_question"],
                        change_pct=movement["change_pct"],
                        old_price=movement["old_price"],
                        new_price=movement["new_price"],
                        downstream_question=edge["downstream_question"],
                        down_price=new_down,
                        mechanism=edge["mechanism"],
                    ),
                    system=SYSTEM_PROMPT,
                )

                if prop and prop.get("trade_recommended") and prop.get("trade_confidence", 0) >= 60:
                    direction = prop.get("expected_direction", "")
                    side = "YES" if "UP" in direction else "NO"
                    edge_pct = abs(prop.get("expected_change_pct", 0))

                    position_usd = min(
                        self.risk.kelly_size(edge=edge_pct / 100, win_prob=0.6),
                        300,
                    )

                    signals.append({
                        "strategy": "S05",
                        "market_id": did,
                        "question": edge["downstream_question"],
                        "side": side,
                        "edge_pct": round(edge_pct, 2),
                        "confidence": prop.get("trade_confidence", 0),
                        "position_usd": position_usd,
                        "reasoning": f"Upstream moved {movement['change_pct']:+.1f}%, "
                                     f"downstream stale. Mechanism: {edge['mechanism']}",
                        "reprice_window": prop.get("reprice_window", "unknown"),
                        "risk_factors": prop.get("risk_factors", []),
                        "market_yes_price": new_down,
                        "clob_token_ids": None,  # Need to fetch
                        "liquidity": None,
                    })

        log.info(f"[S05] {len(signals)} trade signals generated")
        return signals

    def analyze_chains(self, limit: int = 10) -> list[dict]:
        """Analyze multi-hop chains for deeper opportunities."""
        chains = self.graph.find_chains(max_hops=4)
        log.info(f"[S05] Found {len(chains)} multi-hop chains")

        # Prioritize longer chains (less competition)
        chains.sort(key=lambda c: len(c), reverse=True)

        results = []
        for chain in chains[:limit]:
            chain_desc = "\n".join(
                f"Hop {i+1}: [{e['upstream_question'][:50]}] → [{e['downstream_question'][:50]}]\n"
                f"  Mechanism: {e['mechanism']}, Strength: {e['strength']}, Lag: {e['lag']}"
                for i, e in enumerate(chain)
            )

            analysis = self.brain.analyze_json(
                prompt=MULTI_HOP_PROMPT.format(
                    upstream_event=f"Market: {chain[0]['upstream_question']}",
                    chain_description=chain_desc,
                ),
                system=SYSTEM_PROMPT,
                max_tokens=2048,
            )

            if analysis and analysis.get("trade_recommended") and analysis.get("confidence", 0) >= 50:
                results.append({
                    "chain_length": len(chain),
                    "chain": " → ".join(e["upstream_question"][:30] for e in chain)
                             + " → " + chain[-1]["downstream_question"][:30],
                    "analysis": analysis,
                })

        results.sort(
            key=lambda r: abs(r["analysis"].get("mispricing_pct", 0)) * r["analysis"].get("confidence", 0),
            reverse=True,
        )
        return results

    def _search_markets(self, keywords: list[str], limit: int = 10) -> list[dict]:
        """Search for markets matching any of the given keywords."""
        all_markets = self.client.fetch_active_markets()
        matches = {}
        for m in all_markets:
            text = (m.get("question", "") + " " + m.get("description", "")).lower()
            for kw in keywords:
                if kw.lower() in text and m["id"] not in matches:
                    matches[m["id"]] = m
                    break
        return list(matches.values())[:limit]

    def get_current_prices(self) -> dict[str, float]:
        """Get current prices for all markets in the graph."""
        return self.client.get_prices_batch(list(self.graph.get_all_ids()))
