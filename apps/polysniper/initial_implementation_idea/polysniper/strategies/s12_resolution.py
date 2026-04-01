"""S12: Resolution Criteria Exploitation — find markets where crowd interpretation
diverges from actual UMA oracle resolution rules."""
from polysniper.engine.market_client import MarketClient
from polysniper.engine.brain import Brain
from polysniper.engine.risk import RiskManager
from polysniper.logger import log

SYSTEM_PROMPT = """You are a contract lawyer specializing in prediction market
resolution criteria. You analyze resolution rules with extreme precision to
identify where a casual reader's interpretation differs from the strict legal
meaning. You are conservative — only flag issues where you have genuine insight,
not speculative nitpicking. False positives cost real money."""

ANALYSIS_PROMPT = """Analyze the resolution criteria for this Polymarket market.
Identify any cases where:

1. AMBIGUITY: Language that could be interpreted multiple ways
2. EDGE CASES: Plausible scenarios the criteria don't address
3. CROWD vs. RULES DIVERGENCE: Where casual reading differs from strict resolution
4. TEMPORAL GAPS: Missing/ambiguous timeframes or timezone specs
5. SOURCE DEPENDENCY: Resolution sources that could be unavailable or contradictory
6. HISTORICAL PRECEDENT: Similar patterns to past UMA disputes

For each issue, provide:
- severity: "critical" | "high" | "medium" | "low"
- description: What the issue is
- crowd_interpretation: What most traders probably think
- actual_resolution: How UMA would likely resolve based on strict criteria
- trade_signal: Which side (YES/NO) is mispriced and by roughly how much (%)
- confidence: 0-100

Output as JSON:
{{
  "issues_found": true/false,
  "issues": [
    {{
      "severity": "...",
      "description": "...",
      "crowd_interpretation": "...",
      "actual_resolution": "...",
      "trade_side": "YES|NO",
      "mispricing_pct": X.X,
      "confidence": 0-100
    }}
  ],
  "overall_assessment": "Summary of resolution risk"
}}

---

MARKET:
Question: {question}
Description: {description}
Resolution Source: {resolution_source}
Outcomes: {outcomes}
Current YES Price: {yes_price}
End Date: {end_date}
"""

CHALLENGE_PROMPT = """You are a skeptical prediction market trader reviewing an
AI analysis of resolution criteria. Your job is to DISPROVE the analysis.

1. Is the identified ambiguity real or manufactured?
2. Would UMA voters actually resolve this differently than the crowd expects?
3. What counterarguments did the first analysis miss?
4. Would you bet real money on this divergence?

Be harsh. Most "edge cases" don't matter in practice.

ORIGINAL ANALYSIS:
{original_analysis}

Output JSON:
{{
  "confirmed": true/false,
  "trade_recommended": true/false,
  "reasoning": "Why you agree or disagree",
  "adjusted_confidence": 0-100
}}
"""


class S12Scanner:
    """Scan markets for resolution criteria mispricing."""

    def __init__(self):
        self.client = MarketClient()
        self.brain = Brain()
        self.risk = RiskManager()

    def scan(self, min_volume: float = 5000, min_liquidity: float = 1000, limit: int = 50) -> list[dict]:
        """Full scan: fetch markets → analyze resolution → generate signals."""
        log.info("[S12] Starting resolution criteria scan...")

        markets = self.client.fetch_active_markets(
            min_volume=min_volume,
            min_liquidity=min_liquidity,
        )
        log.info(f"[S12] {len(markets)} markets pass volume/liquidity filters")

        # Sort by volume — higher volume markets have more capital at stake
        markets.sort(key=lambda m: m["volume"], reverse=True)
        markets = markets[:limit]

        signals = []
        for i, market in enumerate(markets):
            log.info(f"[S12] Analyzing {i+1}/{len(markets)}: {market['question'][:60]}...")

            signal = self.analyze_market(market)
            if signal:
                signals.append(signal)
                log.info(f"[S12] SIGNAL: {signal['side']} — edge {signal['edge_pct']:.1f}%")

        log.info(f"[S12] Scan complete. {len(signals)} signals from {len(markets)} markets.")
        log.info(f"[S12] API cost: ${self.brain.estimate_cost()['estimated_cost_usd']:.2f}")
        return signals

    def analyze_market(self, market: dict) -> dict | None:
        """Analyze a single market for resolution criteria issues."""
        prompt = ANALYSIS_PROMPT.format(
            question=market.get("question", ""),
            description=market.get("description", "")[:2000],
            resolution_source=market.get("resolution_source", "Not specified"),
            outcomes=market.get("outcomes", ""),
            yes_price=market.get("yes_price", "?"),
            end_date=market.get("end_date", "?"),
        )

        result = self.brain.dual_analyze(
            primary_prompt=prompt,
            challenge_prompt_template=CHALLENGE_PROMPT,
            system=SYSTEM_PROMPT,
        )

        if not result["confirmed"]:
            return None

        primary = result["primary"]
        if not primary.get("issues_found"):
            return None

        # Find the strongest issue
        issues = primary.get("issues", [])
        if not issues:
            return None

        best_issue = max(issues, key=lambda i: i.get("confidence", 0))

        edge_pct = best_issue.get("mispricing_pct", 0)
        confidence = best_issue.get("confidence", 0)

        # Apply challenge adjustment
        challenge = result.get("challenge", {})
        if challenge.get("adjusted_confidence"):
            confidence = min(confidence, challenge["adjusted_confidence"])

        if abs(edge_pct) < 3 or confidence < 70:
            return None

        position_usd = self.risk.kelly_size(
            edge=abs(edge_pct) / 100,
            win_prob=confidence / 100,
        )

        return {
            "strategy": "S12",
            "market_id": market["id"],
            "question": market["question"],
            "side": best_issue.get("trade_side", "YES"),
            "edge_pct": edge_pct,
            "confidence": confidence,
            "position_usd": position_usd,
            "reasoning": best_issue.get("description", ""),
            "crowd_interpretation": best_issue.get("crowd_interpretation", ""),
            "actual_resolution": best_issue.get("actual_resolution", ""),
            "severity": best_issue.get("severity", ""),
            "market_yes_price": market.get("yes_price"),
            "clob_token_ids": market.get("clob_token_ids"),
            "liquidity": market.get("liquidity"),
        }
