import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://kle:kle@localhost:5432/kle")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-secret")
