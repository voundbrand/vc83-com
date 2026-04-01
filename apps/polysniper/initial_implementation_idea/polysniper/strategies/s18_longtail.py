"""S18: Long-Tail Market Sniping — find thin-liquidity markets with massive
mispricings that HFT bots ignore, and place patient limit orders."""
import json
from polysniper.engine.market_client import MarketClient
from polysniper.engine.brain import Brain
from polysniper.engine.risk import RiskManager
from polysniper.logger import log

# Categories where Opus 4.6 has deep domain knowledge
HIGH_KNOWLEDGE_TAGS = {
    "science", "technology", "health", "fda", "legal", "supreme-court",
    "politics", "elections", "economics", "fed", "climate", "ai",
    "space", "education", "international", "trade", "regulation",
    "crypto", "energy", "defense", "immigration",
}

SYSTEM_PROMPT = """You are a superforecaster — top 2% prediction accuracy in
forecasting tournaments. You form independent probability estimates based purely
on evidence and reasoning, never anchoring on market prices. You are well-calibrated
and honest about uncertainty."""

# NOTE: This prompt deliberately does NOT include the market price.
# Anti-anchoring is critical for unbiased probability estimates.
ASSESSMENT_PROMPT = """Estimate the probability that the following prediction market
question resolves YES. Do NOT look at any market price — form your own view.

Process:
1. BASE RATE: Historical base rate for this type of event?
2. EVIDENCE FOR: Specific evidence supporting YES
3. EVIDENCE AGAINST: Specific evidence supporting NO
4. UPDATE: Shift from base rate based on evidence
5. CALIBRATION: Are you being overconfident? Widen uncertainty if needed.

Output JSON:
{{
  "probability_yes": 0.XX,
  "confidence_in_estimate": 0.XX,
  "base_rate": 0.XX,
  "evidence_for": ["point 1", "point 2"],
  "evidence_against": ["point 1", "point 2"],
  "reasoning": "Brief explanation",
  "knowledge_depth": "high|medium|low",
  "key_uncertainty": "Single biggest unknown"
}}

QUESTION: {question}
DESCRIPTION: {description}
RESOLUTION DATE: {end_date}
TAGS: {tags}
"""

COMPARISON_PROMPT = """Compare your independent probability estimate to the
current market price. Be skeptical of your own estimate.

Your estimate: {model_prob:.2f}
Market YES price: {market_price:.2f}
Difference: {diff:+.2f} ({diff_pct:.1f}%)

1. Is this difference real edge or noise?
2. What could the market know that you don't?
3. Is there a systematic reason the market is wrong?
4. Would you bet real money on this?

Output JSON:
{{
  "trade_recommended": true/false,
  "side": "YES|NO",
  "edge_pct": X.X,
  "why_market_wrong": "...",
  "what_market_might_know": "...",
  "conviction": "high|medium|low"
}}
"""


class S18Scanner:
    """Scan long-tail markets for mispriced opportunities."""

    def __init__(self):
        self.client = MarketClient()
        self.brain = Brain()
        self.risk = RiskManager()

    def scan(self, max_analyses: int = 30) -> list[dict]:
        """Full scan: crawl → filter thin markets → assess → compare → signal."""
        log.info("[S18] Starting long-tail market scan...")

        # The sweet spot: $500 - $50K liquidity
        candidates = self.client.fetch_active_markets(
            min_liquidity=500,
            max_liquidity=50000,
        )

        # Filter and score
        scored = []
        for m in candidates:
            yes_price = m.get("yes_price")
            if yes_price is None or yes_price < 0.05 or yes_price > 0.95:
                continue

            score = self._opportunity_score(m)
            m["opp_score"] = score
            scored.append(m)

        scored.sort(key=lambda m: m["opp_score"], reverse=True)
        scored = scored[:max_analyses]

        log.info(f"[S18] {len(scored)} candidates after filtering (from {len(candidates)} thin markets)")

        signals = []
        for i, market in enumerate(scored):
            log.info(
                f"[S18] Assessing {i+1}/{len(scored)}: "
                f"{market['question'][:50]}... (score={market['opp_score']})"
            )

            signal = self.assess_market(market)
            if signal:
                signals.append(signal)
                log.info(f"[S18] SIGNAL: {signal['side']} — edge {signal['edge_pct']:.1f}%")

        log.info(f"[S18] Scan complete. {len(signals)} signals from {len(scored)} candidates.")
        log.info(f"[S18] API cost: ${self.brain.estimate_cost()['estimated_cost_usd']:.2f}")
        return signals

    def assess_market(self, market: dict) -> dict | None:
        """Assess a single market: independent probability → compare to price."""
        # Step 1: Independent estimate (NO price shown)
        assessment = self.brain.analyze_json(
            prompt=ASSESSMENT_PROMPT.format(
                question=market["question"],
                description=market.get("description", "")[:1500],
                end_date=market.get("end_date", "Unknown"),
                tags=", ".join(market.get("tags", [])),
            ),
            system=SYSTEM_PROMPT,
        )

        if not assessment:
            return None

        # Skip low-knowledge or low-confidence estimates
        if assessment.get("knowledge_depth") == "low":
            return None
        if assessment.get("confidence_in_estimate", 0) < 0.5:
            return None

        model_prob = assessment.get("probability_yes", 0.5)
        market_price = market["yes_price"]
        diff = model_prob - market_price

        # Only proceed if divergence is meaningful (>5%)
        if abs(diff) < 0.05:
            return None

        # Step 2: Compare to market (NOW show the price)
        comparison = self.brain.analyze_json(
            prompt=COMPARISON_PROMPT.format(
                model_prob=model_prob,
                market_price=market_price,
                diff=diff,
                diff_pct=abs(diff) * 100,
            ),
            system=SYSTEM_PROMPT,
        )

        if not comparison or not comparison.get("trade_recommended"):
            return None

        edge_pct = comparison.get("edge_pct", abs(diff) * 100)
        conviction = comparison.get("conviction", "low")

        if conviction == "low":
            return None

        # Position sizing — smaller in thinner markets
        liquidity = market.get("liquidity", 1000)
        max_pos = 200 if liquidity < 5000 else 500
        position_usd = min(
            self.risk.kelly_size(edge=abs(edge_pct) / 100, win_prob=0.65),
            max_pos,
        )

        # Calculate limit price (midpoint between market and fair value)
        side = comparison.get("side", "YES")
        if side == "YES":
            fair = model_prob
            limit_price = round((market_price + fair) / 2, 3)
            limit_price = min(limit_price, fair - 0.02)
        else:
            fair = 1 - model_prob
            no_ask = 1 - market_price
            limit_price = round((no_ask + fair) / 2, 3)
            limit_price = min(limit_price, fair - 0.02)

        return {
            "strategy": "S18",
            "market_id": market["id"],
            "question": market["question"],
            "side": side,
            "edge_pct": round(edge_pct, 2),
            "confidence": round(assessment.get("confidence_in_estimate", 0.5) * 100),
            "conviction": conviction,
            "position_usd": position_usd,
            "limit_price": limit_price,
            "model_probability": model_prob,
            "market_yes_price": market_price,
            "reasoning": assessment.get("reasoning", ""),
            "key_uncertainty": assessment.get("key_uncertainty", ""),
            "why_market_wrong": comparison.get("why_market_wrong", ""),
            "clob_token_ids": market.get("clob_token_ids"),
            "liquidity": liquidity,
        }

    def _opportunity_score(self, market: dict) -> int:
        """Score a market's opportunity potential. Higher = better."""
        score = 0
        liq = market.get("liquidity", 0)
        vol = market.get("volume", 0)
        tags = set(market.get("tags", []))

        # Thinner = higher potential edge
        if liq < 5000:
            score += 3
        elif liq < 15000:
            score += 2
        else:
            score += 1

        # Domain knowledge match
        if tags & HIGH_KNOWLEDGE_TAGS:
            score += 2

        # High demand, low supply (vol/liq ratio)
        if vol > 0 and liq > 0 and (vol / liq) > 5:
            score += 2

        return score
