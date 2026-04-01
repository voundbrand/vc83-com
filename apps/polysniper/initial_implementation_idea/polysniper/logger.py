"""Structured logging with rich output for terminal, JSON for file."""
import logging
import json
import sys
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.logging import RichHandler

console = Console()


class JSONFileHandler(logging.Handler):
    """Append JSON-line logs to file for audit trail."""

    def __init__(self, filepath: str):
        super().__init__()
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        self.filepath = filepath

    def emit(self, record):
        entry = {
            "ts": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "module": record.module,
            "msg": record.getMessage(),
        }
        if hasattr(record, "trade_data"):
            entry["trade"] = record.trade_data
        with open(self.filepath, "a") as f:
            f.write(json.dumps(entry) + "\n")


def setup_logger(name: str = "polysniper", level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        # Rich console handler
        rich_handler = RichHandler(
            console=console,
            show_time=True,
            show_path=False,
            markup=True,
        )
        rich_handler.setLevel(logging.INFO)
        logger.addHandler(rich_handler)

        # JSON file handler for audit
        json_handler = JSONFileHandler("data/logs/polysniper.jsonl")
        json_handler.setLevel(logging.DEBUG)
        logger.addHandler(json_handler)

    return logger


log = setup_logger()
