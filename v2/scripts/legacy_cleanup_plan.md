# Legacy cleanup — Phase 6 tail

Once the v2 stack is running and the React/Vite merge/outdated/compliance pages are live,
these can be removed from the repo root **in this order**:

## Safe to delete immediately (dead / duplicated code)
- `run_cache_generation.py`
- `run_combined_cache_generation.py`
- `run_direct_cache_generation.py`
- `run_product_pipeline.py`
- `run_trigger_for_products.py`
- `run.py`
- `run_server.py`
- `generate_embeddings.py`   (duplicate of `periodic_script/embedding.py`)
- `similarity_check.py`      (superseded by `POST /api/v1/search/similar`)
- `merge_api_test.py`        (throw-away test script)
- `KL-Quality-Enhancer-main/`  (verify it is a copy of the whole project, then drop)
- `app_backup.py` (already deleted in git status)

## Delete AFTER Streamlit is retired
- `app.py`                   (2678 LOC Streamlit dashboard)
- `outdated_content_ui.py`
- `outdated_content_utils.py`
- `merge_panel_ui.py`
- `merge_integration.py`
- `merge_queue_utils.py`
- `merge_queue_integration_helpers.py`
- `merge_utils.py`
- `review_panel.py`
- `pipeline/`                (superseded by `v2/app/workers/`)
- `periodic_script/`         (superseded by Celery beat + tasks)
- `api/main.py`              (was never finished)
- `backend/`                 (superseded by `v2/app/`)

## Delete AFTER migration into Postgres is verified
- `cache/`                   (multi-GB monolithic JSON caches)
- `cleaned_dataset/`         (source data now lives in `qa_entries`)
- `processed_clusters/`
- `clusters/`
- `embedding_cache/`
- `models/`                  (per-run FAISS + npy dumps)
- `merged_qa_pairs/`
- `output/`
- `merge_history.jsonl`, `merge_queue.log`, `*.log`
- `data/merge_queue.json`, `data/merge_history.json`

## Keep (still useful)
- `data/AnswerLibraryEntry.csv`, `data/CanonicalQuestionProducts.csv`,
  `data/Product.csv`   —  original inputs; keep in cold storage.
- `README.md`            —  update to point at `v2/README.md`.
- `frontend/`            —  will be modified in-place by copying `v2/frontend/**`.
