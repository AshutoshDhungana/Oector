from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    log_level: str = "INFO"

    database_url: str = "postgresql+psycopg://kle:kle@postgres:5432/kle"
    redis_url: str = "redis://redis:6379/0"
    db_pool_size: int = 5
    db_max_overflow: int = 5

    jwt_secret: str = "change-me-please"
    jwt_alg: str = "HS256"
    jwt_expire_minutes: int = 60

    cors_allow_origins: str = "http://localhost:3000"

    # ─── LLM (OpenAI-compatible, e.g. Ollama) ─────────────────────────
    # Any OpenAI-compat endpoint works: Ollama, vLLM, LM Studio.
    llm_provider: str = "ollama"                          # non-empty label; requests use LLM_BASE_URL
    llm_base_url: str = "http://host.docker.internal:11434/v1"
    llm_model: str = "qwen2.5:3b-instruct"                # drafting + classification
    llm_pro_model: str = "qwen2.5:3b-instruct"            # heavier reasoning (merge). Same by default.
    llm_api_key: str = ""                                 # empty for local; Ollama accepts anything

    # ─── Embeddings (local sentence-transformers) ─────────────────────
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    embedding_batch_size: int = 256
    embedding_pending_limit: int = 2000
    embedding_task_lock_seconds: int = 3600
    cluster_task_lock_seconds: int = 3600

    # ─── Legacy Google Gemini keys (unused when llm_provider=ollama) ──
    google_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_pro_model: str = "gemini-2.5-pro"              # retained for older env files

    # ─── Answer-drafting knobs ────────────────────────────────────────
    answer_top_k: int = 6                           # retrieval fanout
    answer_confidence_threshold: float = 0.55       # below → flag as gap, no draft
    answer_no_auth: bool = True                     # bypass auth for the demo (all protected endpoints)

    # ─── Legacy / not used with Gemini path ───────────────────────────
    anthropic_api_key: str = ""                     # kept only so old .env files don't break
    llm_classify_model: str = "gemini-2.5-flash"    # legacy alias; calls resolve to LLM_MODEL
    llm_merge_model: str = "gemini-2.5-flash"

    outdated_age_days: int = 90                     # retained; current age thresholds are hard-coded
    compliance_poll_minutes: int = 60               # retained; current Beat schedule is hard-coded

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
