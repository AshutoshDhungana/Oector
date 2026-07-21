# Performance guide

This project uses pgvector, Redis, Celery, sentence-transformers, and an
OpenAI-compatible LLM endpoint. The fastest safe configuration depends on the
CPU, RAM, disk, embedding model, and LLM server, so tune from measurements
rather than increasing every concurrency value at once.

## What is optimized by default

- Embedding work is single-flight and drains continuously. Imports, datasource
  syncs, Beat, and manual preparation can all request it, but only one task
  owns the backlog at a time.
- Each embedding batch runs one model encode and one PostgreSQL bulk upsert.
  It hands all changed IDs to one cluster batch instead of creating a Celery
  task per vector.
- Repeated source syncs avoid rewriting external-ID rows whose content and
  source metadata are unchanged. Rows without an external ID are checked in a
  set-based query.
- Questionnaire drafting commits each result and progress checkpoint
  independently. A retry can resume from completed items, and the review UI
  polls a small progress response while drafting instead of reloading the full
  questionnaire every few seconds. Bulk approval uses one transactional API
  call instead of one request and commit per item.
- The dashboard has one adaptive index-status poller. It polls quickly during
  preparation, slows down when idle, and backs off in a hidden browser tab.

## First-run workflow

~~~powershell
docker compose run --rm api alembic upgrade head
docker compose up -d api worker beat
docker compose logs -f worker
~~~

The worker logs `embed_batch_done` with encode, write, and total timings. A
backlog should produce consecutive batch-complete messages rather than waiting
for the two-minute Beat interval. `online_assign_batch_done` reports the
corresponding batched cluster work.

## Safe starting knobs

| Setting | Start with | Tune when |
| --- | --- | --- |
| `EMBEDDING_PENDING_LIMIT` | 2000 | Reduce if a task approaches its 25-minute soft timeout or RAM is tight; increase only after timing a full batch. |
| `EMBEDDING_BATCH_SIZE` | 256 | Increase only if GPU/CPU RAM and model throughput permit it. |
| `CELERY_WORKER_CONCURRENCY` | 2 | Increase only when CPU, RAM, and the LLM endpoint have spare capacity. Each prefork child loads a model. |
| `EMBEDDING_CPU_THREADS` | 2 | Keep `concurrency * threads` near, not far above, available physical CPU cores. |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | 5 / 5 | Raise only after checking connection saturation. These limits apply per process. |

Apply changed Compose variables with:

~~~powershell
docker compose up -d --force-recreate api worker
~~~

The named `model_cache` volume preserves the sentence-transformer download.
The first encode on a new volume is therefore expected to be slower; later
container restarts should not download MiniLM again.

## Measure before changing storage or retrieval

Use worker timings first, then inspect query plans on a copy of realistic data:

~~~powershell
docker compose exec postgres psql -U kle -d kle
~~~

From `psql`, use `EXPLAIN (ANALYZE, BUFFERS)` on the exact browse or retrieval
query that is slow. Do this especially for product-filtered vector queries:
pgvector's approximate HNSW filtering can under-return rows if the filtered
candidate set is too small. Do not add an index or replace pgvector without a
plan and recall measurement.

For queue visibility, [Flower](https://flower.readthedocs.io/) is a useful
open-source Celery monitor. For PostgreSQL query evidence, enable and inspect
the [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
extension in a non-demo deployment. These tools reveal queue wait time,
task duration, lock pressure, and slow SQL before a configuration change is
made.

## Optional accelerators, only after a benchmark

- Sentence Transformers supports ONNX and OpenVINO backends. They can improve
  CPU embedding throughput, but changing backend/model output must be evaluated
  for retrieval quality and followed by a full re-embedding if compatibility
  changes.
- A GPU-capable OpenAI-compatible server such as vLLM can continuously batch
  independent LLM requests. Use it only when the local Ollama endpoint is the
  measured drafting bottleneck and the deployment has compatible GPU capacity.
- Qdrant is an open-source vector database with payload filters. Consider it
  only if `EXPLAIN` and recall tests show pgvector's product-filtered vector
  searches are the bottleneck at your data scale. It is not required for the
  current single-database deployment.

The relevant upstream references are the
[pgvector README](https://github.com/pgvector/pgvector),
[Celery optimization guide](https://docs.celeryq.dev/en/stable/userguide/optimizing.html),
and [Sentence Transformers efficiency documentation](https://sbert.net/docs/sentence_transformer/usage/efficiency.html).
