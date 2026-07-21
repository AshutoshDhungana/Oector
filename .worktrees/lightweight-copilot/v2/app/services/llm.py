"""LLM client for any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio).

Public API preserved from the Gemini implementation:

    call_json(prompt, *, model, system=None, max_tokens=800, ttl_seconds=...)  -> dict
    call_text(prompt, *, model=None, system=None, ...)                         -> str

Callers pass a model string (e.g. "qwen2.5:3b-instruct"); we resolve legacy
Gemini/Claude ids to settings.llm_model automatically so no downstream code
needs to change.
"""

from __future__ import annotations

import hashlib
import json
import threading
from typing import Any, Optional

import redis
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.logging_config import get_logger

log = get_logger(__name__)

_client = None
_client_lock = threading.Lock()
_redis: Optional[redis.Redis] = None


def _get_client():
    """Lazy singleton OpenAI-compat client."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                from openai import OpenAI
                _client = OpenAI(
                    base_url=settings.llm_base_url,
                    # Ollama accepts anything; pass a sentinel so the SDK doesn't complain
                    # if the env is empty.
                    api_key=settings.llm_api_key or "sk-local",
                    timeout=120.0,
                    max_retries=0,   # tenacity handles retries
                )
    return _client


def _get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url)
    return _redis


def _cache_key(model: str, prompt: str, system: str | None, kind: str) -> str:
    h = hashlib.sha256()
    h.update(kind.encode())
    h.update(b"\x1f")
    h.update(model.encode())
    h.update(b"\x1f")
    h.update((system or "").encode())
    h.update(b"\x1f")
    h.update(prompt.encode())
    return "llm:" + h.hexdigest()


def _resolve_model(model: str | None) -> str:
    """Accept legacy Claude/Gemini ids gracefully — route them to the configured local model."""
    if not model:
        return settings.llm_model
    if model.startswith(("claude-", "gemini-")):
        return settings.llm_model
    return model


def llm_available() -> bool:
    """True if a local LLM endpoint is configured. Cheap check used by workers to gate calls."""
    return bool(settings.llm_base_url) and settings.llm_provider != ""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
def _chat(
    prompt: str,
    *,
    model: str,
    system: str | None,
    max_tokens: int,
    json_mode: bool,
) -> str:
    """Single retry-wrapped OpenAI-compat call. Returns raw text."""
    client = _get_client()

    messages: list[dict] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    if json_mode:
        # Ollama supports response_format={"type": "json_object"} for models
        # that handle it (Qwen 2.5 does). Falls back silently for those that don't.
        kwargs["response_format"] = {"type": "json_object"}

    resp = client.chat.completions.create(**kwargs)
    if not resp.choices:
        return ""
    return resp.choices[0].message.content or ""


def call_json(
    prompt: str,
    *,
    model: str,
    system: str | None = None,
    max_tokens: int = 800,
    ttl_seconds: int = 60 * 60 * 24,
) -> dict[str, Any]:
    """Call the LLM expecting a JSON object reply. Cached by prompt hash in Redis."""
    model = _resolve_model(model)
    key = _cache_key(model, prompt, system, kind="json")
    r = _get_redis()
    cached = r.get(key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            r.delete(key)

    text_out = _chat(
        prompt, model=model, system=system, max_tokens=max_tokens, json_mode=True
    )
    obj = _extract_json(text_out)
    r.setex(key, ttl_seconds, json.dumps(obj))
    return obj


def call_text(
    prompt: str,
    *,
    model: str | None = None,
    system: str | None = None,
    max_tokens: int = 800,
    ttl_seconds: int = 60 * 60,
    use_cache: bool = True,
) -> str:
    """Call the LLM expecting free-form text back (e.g. drafted answer)."""
    model = _resolve_model(model)
    if use_cache:
        key = _cache_key(model, prompt, system, kind="text")
        r = _get_redis()
        cached = r.get(key)
        if cached:
            return cached.decode()

    text_out = _chat(
        prompt, model=model, system=system, max_tokens=max_tokens, json_mode=False
    ).strip()

    if use_cache and text_out:
        r = _get_redis()
        key = _cache_key(model, prompt, system, kind="text")
        r.setex(key, ttl_seconds, text_out)
    return text_out


def _extract_json(s: str) -> dict:
    s = s.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.lower().startswith("json"):
            s = s[4:]
        s = s.strip()
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"no JSON object in LLM reply: {s[:200]}")
    return json.loads(s[start : end + 1])
