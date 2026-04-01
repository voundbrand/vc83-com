"""Central configuration — loads from .env, validates, exposes typed settings."""
import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    # API keys
    anthropic_api_key: str = ""
    polygon_rpc_url: str = ""
    private_key: str = ""
    openrouter_api_key: str = ""
    proxy_url: str = ""

    # Risk management
    max_position_usd: float = 200.0
    max_daily_volume_usd: float = 1000.0
    max_bankroll_pct: float = 0.10
    stop_loss_multiplier: float = 2.0
    min_edge_pct: float = 3.0
    min_confidence: int = 70

    # Strategy toggles
    enable_s12: bool = True
    enable_s18: bool = True
    enable_s05: bool = True

    # Monitoring
    scan_interval_seconds: int = 300
    log_level: str = "INFO"

    # Model
    model: str = "claude-opus-4-6-20260214"

    # Paths
    data_dir: str = "./data"

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            polygon_rpc_url=os.getenv("POLYGON_RPC_URL", ""),
            private_key=os.getenv("PRIVATE_KEY", ""),
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
            proxy_url=os.getenv("PROXY_URL", ""),
            max_position_usd=float(os.getenv("MAX_POSITION_USD", "200")),
            max_daily_volume_usd=float(os.getenv("MAX_DAILY_VOLUME_USD", "1000")),
            max_bankroll_pct=float(os.getenv("MAX_BANKROLL_PCT", "0.10")),
            stop_loss_multiplier=float(os.getenv("STOP_LOSS_MULTIPLIER", "2.0")),
            min_edge_pct=float(os.getenv("MIN_EDGE_PCT", "3.0")),
            min_confidence=int(os.getenv("MIN_CONFIDENCE", "70")),
            enable_s12=os.getenv("ENABLE_S12", "true").lower() == "true",
            enable_s18=os.getenv("ENABLE_S18", "true").lower() == "true",
            enable_s05=os.getenv("ENABLE_S05", "true").lower() == "true",
            scan_interval_seconds=int(os.getenv("SCAN_INTERVAL_SECONDS", "300")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )

    def validate(self) -> list[str]:
        errors = []
        if not self.anthropic_api_key:
            errors.append("ANTHROPIC_API_KEY is required")
        if not self.polygon_rpc_url:
            errors.append("POLYGON_RPC_URL is required")
        if not self.private_key:
            errors.append("PRIVATE_KEY is required")
        if self.max_position_usd <= 0:
            errors.append("MAX_POSITION_USD must be positive")
        if self.min_edge_pct <= 0:
            errors.append("MIN_EDGE_PCT must be positive")
        return errors


cfg = Config.from_env()
