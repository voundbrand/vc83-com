"""Risk management — position sizing, daily limits, kill switches."""
import json
from datetime import datetime, date
from pathlib import Path

from polysniper.config import cfg
from polysniper.logger import log


class RiskManager:
    """
    Enforces risk limits across all strategies.
    Every trade goes through here before execution.
    """

    def __init__(self, bankroll: float = 5000.0):
        self.bankroll = bankroll
        self.ledger_path = Path(cfg.data_dir) / "ledger.json"
        self.ledger_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_ledger()

    def _load_ledger(self):
        if self.ledger_path.exists():
            with open(self.ledger_path) as f:
                self.ledger = json.load(f)
        else:
            self.ledger = {"trades": [], "daily_volume": {}}

    def _save_ledger(self):
        with open(self.ledger_path, "w") as f:
            json.dump(self.ledger, f, indent=2, default=str)

    def check_trade(self, signal: dict) -> dict:
        """
        Validate a trade signal against all risk limits.
        Returns {approved: bool, reason: str, adjusted_size: float}
        """
        position_usd = signal.get("position_usd", 0)
        edge_pct = abs(signal.get("edge_pct", 0))
        confidence = signal.get("confidence", 0)

        # Check minimum edge
        if edge_pct < cfg.min_edge_pct:
            return {"approved": False, "reason": f"Edge {edge_pct:.1f}% < min {cfg.min_edge_pct}%"}

        # Check minimum confidence
        if confidence < cfg.min_confidence:
            return {"approved": False, "reason": f"Confidence {confidence} < min {cfg.min_confidence}"}

        # Check max position size
        if position_usd > cfg.max_position_usd:
            position_usd = cfg.max_position_usd
            log.info(f"Position capped at ${cfg.max_position_usd}")

        # Check max bankroll percentage
        max_from_bankroll = self.bankroll * cfg.max_bankroll_pct
        if position_usd > max_from_bankroll:
            position_usd = max_from_bankroll
            log.info(f"Position capped at {cfg.max_bankroll_pct*100:.0f}% bankroll (${max_from_bankroll:.0f})")

        # Check daily volume limit
        today = str(date.today())
        daily_vol = self.ledger.get("daily_volume", {}).get(today, 0)
        if daily_vol + position_usd > cfg.max_daily_volume_usd:
            remaining = cfg.max_daily_volume_usd - daily_vol
            if remaining <= 10:
                return {"approved": False, "reason": f"Daily volume limit reached (${daily_vol:.0f}/{cfg.max_daily_volume_usd:.0f})"}
            position_usd = remaining
            log.info(f"Position reduced to ${remaining:.0f} (daily limit)")

        return {
            "approved": True,
            "reason": "OK",
            "adjusted_size": round(position_usd, 2),
        }

    def record_trade(self, signal: dict, execution: dict):
        """Record a completed trade in the ledger."""
        today = str(date.today())
        position_usd = execution.get("filled_usd", signal.get("position_usd", 0))

        trade_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "market_id": signal.get("market_id"),
            "question": signal.get("question", "")[:100],
            "strategy": signal.get("strategy", "unknown"),
            "side": signal.get("side"),
            "size_usd": position_usd,
            "edge_pct": signal.get("edge_pct"),
            "confidence": signal.get("confidence"),
            "entry_price": execution.get("fill_price"),
            "status": execution.get("status", "placed"),
        }

        self.ledger["trades"].append(trade_record)

        if today not in self.ledger.get("daily_volume", {}):
            self.ledger.setdefault("daily_volume", {})[today] = 0
        self.ledger["daily_volume"][today] += position_usd

        self._save_ledger()
        log.info(
            f"Trade recorded: {signal.get('side')} ${position_usd:.0f} on "
            f"{signal.get('question', '')[:50]}..."
        )

    def kelly_size(
        self,
        edge: float,
        win_prob: float,
        fraction: float = 0.5,
    ) -> float:
        """
        Half-Kelly position sizing.
        edge: expected edge as decimal (e.g., 0.10 for 10%)
        win_prob: probability of winning the trade
        fraction: Kelly fraction (0.5 = half-Kelly)
        """
        if edge <= 0 or win_prob <= 0 or win_prob >= 1:
            return 0

        b = edge / win_prob  # simplified odds
        if b <= 0:
            return 0

        q = 1 - win_prob
        kelly = (b * win_prob - q) / b
        kelly = max(0, kelly)

        position = self.bankroll * kelly * fraction
        position = min(position, cfg.max_position_usd)
        return round(position, 2)

    def get_stats(self) -> dict:
        """Return portfolio statistics."""
        trades = self.ledger.get("trades", [])
        today = str(date.today())
        daily_vol = self.ledger.get("daily_volume", {}).get(today, 0)

        return {
            "total_trades": len(trades),
            "daily_volume_usd": daily_vol,
            "daily_limit_remaining": cfg.max_daily_volume_usd - daily_vol,
            "bankroll": self.bankroll,
        }
