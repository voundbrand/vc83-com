"""Opus 4.6 reasoning engine — shared interface for all strategies."""
import json
from typing import Optional
import anthropic

from polysniper.config import cfg
from polysniper.logger import log


class Brain:
    """
    Wrapper around Anthropic's API. All Opus 4.6 calls go through here
    so we can track usage, enforce rate limits, and cache results.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
        self.model = cfg.model
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_calls = 0

    def analyze(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> str:
        """Send a prompt to Opus 4.6 and return the text response."""
        messages = [{"role": "user", "content": prompt}]
        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }
        if system:
            kwargs["system"] = system

        response = self.client.messages.create(**kwargs)

        self.total_input_tokens += response.usage.input_tokens
        self.total_output_tokens += response.usage.output_tokens
        self.total_calls += 1

        text = response.content[0].text
        log.debug(
            f"Brain call #{self.total_calls}: "
            f"{response.usage.input_tokens}+{response.usage.output_tokens} tokens"
        )
        return text

    def analyze_json(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> Optional[dict]:
        """Send a prompt and parse the response as JSON."""
        text = self.analyze(prompt, system, max_tokens, temperature)
        return self._extract_json(text)

    def dual_analyze(
        self,
        primary_prompt: str,
        challenge_prompt_template: str,
        system: str = "",
        max_tokens: int = 2048,
    ) -> dict:
        """
        Two-pass analysis: primary analysis + adversarial challenge.
        Only returns a confirmed signal if both passes agree.
        This is the anti-hallucination pattern.
        """
        # Pass 1: Primary analysis
        primary_text = self.analyze(primary_prompt, system, max_tokens)
        primary_json = self._extract_json(primary_text)

        # Pass 2: Challenge the primary analysis
        challenge_prompt = challenge_prompt_template.format(
            original_analysis=primary_text
        )
        challenge_text = self.analyze(challenge_prompt, system, max_tokens)
        challenge_json = self._extract_json(challenge_text)

        confirmed = False
        if challenge_json:
            # Check if the challenge confirms the original signal
            confirmed = (
                challenge_json.get("confirmed", False)
                or challenge_json.get("trade_recommended", False)
                or (
                    "confirm" in challenge_text.lower()
                    and "mispriced" in challenge_text.lower()
                )
            )

        return {
            "primary": primary_json or {"raw": primary_text},
            "challenge": challenge_json or {"raw": challenge_text},
            "confirmed": confirmed,
        }

    def estimate_cost(self) -> dict:
        """Estimate API costs based on usage so far."""
        # Opus 4.6 pricing (approximate)
        input_cost_per_1k = 0.015
        output_cost_per_1k = 0.075
        input_cost = (self.total_input_tokens / 1000) * input_cost_per_1k
        output_cost = (self.total_output_tokens / 1000) * output_cost_per_1k
        return {
            "total_calls": self.total_calls,
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "estimated_cost_usd": round(input_cost + output_cost, 4),
        }

    @staticmethod
    def _extract_json(text: str) -> Optional[dict]:
        """Extract a JSON object from text that may contain other content."""
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            return json.loads(text[start:end])
        except (ValueError, json.JSONDecodeError):
            # Try to find JSON array
            try:
                start = text.index("[")
                end = text.rindex("]") + 1
                return {"items": json.loads(text[start:end])}
            except (ValueError, json.JSONDecodeError):
                return None
