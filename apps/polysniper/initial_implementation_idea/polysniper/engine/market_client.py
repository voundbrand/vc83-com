"""Polymarket API client — wraps Gamma API + CLOB for market data and trading."""
import json
import time
from typing import Optional
import requests

from polysniper.config import cfg
from polysniper.logger import log

GAMMA_BASE = "https://gamma-api.polymarket.com"
CLOB_BASE = "https://clob.polymarket.com"


class MarketClient:
    """Read-only market data from Gamma API. No auth needed."""

    def __init__(self):
        self.session = requests.Session()
        if cfg.proxy_url:
            self.session.proxies = {"https": cfg.proxy_url, "http": cfg.proxy_url}
        self._cache: dict = {}
        self._cache_ts: dict = {}
        self._cache_ttl = 60  # seconds

    def _get(self, url: str, params: dict = None, cache_key: str = None) -> dict | list:
        if cache_key and cache_key in self._cache:
            if time.time() - self._cache_ts[cache_key] < self._cache_ttl:
                return self._cache[cache_key]

        resp = self.session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if cache_key:
            self._cache[cache_key] = data
            self._cache_ts[cache_key] = time.time()
        return data

    def fetch_active_markets(
        self,
        min_volume: float = 0,
        min_liquidity: float = 0,
        max_liquidity: float = float("inf"),
    ) -> list[dict]:
        """Fetch all active markets, with optional volume/liquidity filters."""
        markets = []
        offset = 0
        limit = 100

        while True:
            batch = self._get(
                f"{GAMMA_BASE}/markets",
                params={"active": "true", "closed": "false", "limit": limit, "offset": offset},
            )
            if not batch:
                break
            markets.extend(batch)
            offset += limit
            if len(batch) < limit:
                break

        filtered = []
        for m in markets:
            vol = float(m.get("volume", 0) or 0)
            liq = float(m.get("liquidity", 0) or 0)
            if vol < min_volume or liq < min_liquidity or liq > max_liquidity:
                continue
            filtered.append(self._normalize_market(m))

        log.info(f"Fetched {len(filtered)} markets (of {len(markets)} total)")
        return filtered

    def fetch_market(self, market_id: str) -> Optional[dict]:
        """Fetch a single market by ID."""
        try:
            data = self._get(f"{GAMMA_BASE}/markets/{market_id}")
            return self._normalize_market(data)
        except Exception as e:
            log.error(f"Failed to fetch market {market_id}: {e}")
            return None

    def fetch_events(self) -> list[dict]:
        """Fetch active events (multi-market groupings)."""
        events = []
        offset = 0
        limit = 50
        while True:
            batch = self._get(
                f"{GAMMA_BASE}/events",
                params={"active": "true", "closed": "false", "limit": limit, "offset": offset},
            )
            if not batch:
                break
            events.extend(batch)
            offset += limit
            if len(batch) < limit:
                break
        return events

    def get_price(self, market_id: str) -> Optional[float]:
        """Get current YES price for a market."""
        m = self.fetch_market(market_id)
        if m:
            return m.get("yes_price")
        return None

    def get_prices_batch(self, market_ids: list[str]) -> dict[str, float]:
        """Get YES prices for multiple markets."""
        prices = {}
        for mid in market_ids:
            p = self.get_price(mid)
            if p is not None:
                prices[mid] = p
        return prices

    def search_markets(self, keyword: str, limit: int = 20) -> list[dict]:
        """Search markets by keyword in question/description."""
        all_markets = self.fetch_active_markets()
        kw = keyword.lower()
        matches = [
            m for m in all_markets
            if kw in m.get("question", "").lower() or kw in m.get("description", "").lower()
        ]
        return matches[:limit]

    def _normalize_market(self, m: dict) -> dict:
        """Normalize raw Gamma API response into a clean dict."""
        prices = m.get("outcomePrices", "")
        if isinstance(prices, str):
            try:
                prices = json.loads(prices)
            except (json.JSONDecodeError, TypeError):
                prices = []

        yes_price = float(prices[0]) if prices and len(prices) > 0 else None
        no_price = float(prices[1]) if prices and len(prices) > 1 else None

        tags = m.get("tags", []) or []
        tag_slugs = []
        for t in tags:
            if isinstance(t, dict):
                tag_slugs.append(t.get("slug", t.get("label", "")))
            else:
                tag_slugs.append(str(t))

        return {
            "id": m.get("id", ""),
            "condition_id": m.get("conditionId", ""),
            "question": m.get("question", ""),
            "slug": m.get("slug", ""),
            "description": m.get("description", ""),
            "resolution_source": m.get("resolutionSource", ""),
            "end_date": m.get("endDate", ""),
            "yes_price": yes_price,
            "no_price": no_price,
            "outcomes": m.get("outcomes", ""),
            "volume": float(m.get("volume", 0) or 0),
            "liquidity": float(m.get("liquidity", 0) or 0),
            "clob_token_ids": m.get("clobTokenIds", ""),
            "tags": tag_slugs,
        }
