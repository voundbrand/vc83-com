"""Trade execution — places orders via Polymarket CLOB. Supports paper trading mode."""
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from polysniper.config import cfg
from polysniper.logger import log


class Trader:
    """
    Handles order placement. Two modes:
    - paper: logs trades to file, no real execution
    - live: uses py-clob-client to place real orders
    """

    def __init__(self, mode: str = "paper"):
        self.mode = mode
        self.paper_log_path = Path(cfg.data_dir) / "paper_trades.json"
        self.paper_log_path.parent.mkdir(parents=True, exist_ok=True)
        self._clob_client = None

        if mode == "live":
            self._init_clob()

    def _init_clob(self):
        """Initialize the Polymarket CLOB client for live trading."""
        try:
            from py_clob_client.client import ClobClient
            from py_clob_client.clob_types import ApiCreds

            self._clob_client = ClobClient(
                "https://clob.polymarket.com",
                key=cfg.private_key,
                chain_id=137,  # Polygon mainnet
            )
            # Derive API creds
            self._clob_client.set_api_creds(self._clob_client.create_or_derive_api_creds())
            log.info("CLOB client initialized (LIVE mode)")
        except ImportError:
            log.error("py-clob-client not installed. Run: pip install py-clob-client")
            self.mode = "paper"
        except Exception as e:
            log.error(f"CLOB init failed: {e}. Falling back to paper mode.")
            self.mode = "paper"

    def place_order(self, signal: dict) -> dict:
        """
        Place an order based on a trade signal.
        Returns execution result.
        """
        if self.mode == "paper":
            return self._paper_trade(signal)
        else:
            return self._live_trade(signal)

    def _paper_trade(self, signal: dict) -> dict:
        """Log a paper trade — no real money involved."""
        execution = {
            "status": "paper_filled",
            "mode": "paper",
            "timestamp": datetime.utcnow().isoformat(),
            "market_id": signal.get("market_id"),
            "question": signal.get("question", "")[:100],
            "side": signal.get("side"),
            "size_usd": signal.get("position_usd"),
            "limit_price": signal.get("limit_price"),
            "fill_price": signal.get("limit_price", signal.get("market_yes_price")),
            "filled_usd": signal.get("position_usd"),
            "strategy": signal.get("strategy"),
            "edge_pct": signal.get("edge_pct"),
            "confidence": signal.get("confidence"),
        }

        # Append to paper trade log
        existing = []
        if self.paper_log_path.exists():
            with open(self.paper_log_path) as f:
                existing = json.load(f)
        existing.append(execution)
        with open(self.paper_log_path, "w") as f:
            json.dump(existing, f, indent=2, default=str)

        log.info(
            f"[PAPER] {signal.get('side')} ${signal.get('position_usd', 0):.0f} "
            f"@ {signal.get('limit_price', '?')} — {signal.get('question', '')[:50]}"
        )
        return execution

    def _live_trade(self, signal: dict) -> dict:
        """Place a real order on Polymarket via CLOB."""
        if not self._clob_client:
            return {"status": "error", "reason": "CLOB client not initialized"}

        try:
            from py_clob_client.order_builder.constants import BUY
            from py_clob_client.clob_types import OrderArgs

            side = signal.get("side", "YES")
            token_ids = signal.get("clob_token_ids", "")
            if isinstance(token_ids, str):
                try:
                    token_ids = json.loads(token_ids)
                except:
                    token_ids = []

            # YES = token_ids[0], NO = token_ids[1]
            token_id = token_ids[0] if side == "YES" else token_ids[1] if len(token_ids) > 1 else None
            if not token_id:
                return {"status": "error", "reason": "No token ID found"}

            price = signal.get("limit_price", 0.5)
            size = signal.get("position_usd", 0) / price if price > 0 else 0

            order_args = OrderArgs(
                price=price,
                size=size,
                side=BUY,
                token_id=token_id,
            )

            signed_order = self._clob_client.create_order(order_args)
            result = self._clob_client.post_order(signed_order, "GTC")

            log.info(
                f"[LIVE] Order placed: {side} {size:.1f} shares @ ${price:.3f} "
                f"— {signal.get('question', '')[:50]}"
            )

            return {
                "status": "placed",
                "mode": "live",
                "order_id": result.get("orderID", ""),
                "fill_price": price,
                "filled_usd": signal.get("position_usd"),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            log.error(f"Live trade failed: {e}")
            return {"status": "error", "reason": str(e)}

    def get_paper_trades(self) -> list[dict]:
        """Return all paper trades."""
        if self.paper_log_path.exists():
            with open(self.paper_log_path) as f:
                return json.load(f)
        return []
