from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "kle",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.tasks.ingest",
        "app.workers.tasks.embed",
        "app.workers.tasks.cluster",
        "app.workers.tasks.outdated_check",
        "app.workers.tasks.merge_suggest",
        "app.workers.tasks.merge_suggest_batch",
        "app.workers.tasks.compliance_poll",
        "app.workers.tasks.datasource_sync",
        "app.workers.tasks.draft_questionnaire",
        "app.workers.tasks.conflict_scan",
        "app.workers.tasks.mapping_batch",
    ],
)

celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=60 * 30,
    task_soft_time_limit=60 * 25,
    result_expires=3600,
    broker_connection_retry_on_startup=True,
)

celery_app.conf.beat_schedule = {
    "embed-new-entries-every-2min": {
        "task": "app.workers.tasks.embed.embed_pending",
        "schedule": 120.0,
    },
    "outdated-scan-hourly": {
        "task": "app.workers.tasks.outdated_check.scan_batch",
        "schedule": crontab(minute=5),
    },
    # Compliance crawler — every 15 minutes so the demo can show live activity.
    "compliance-poll-15min": {
        "task": "app.workers.tasks.compliance_poll.poll_all",
        "schedule": 15 * 60.0,
    },
    "cluster-nightly-rebuild": {
        "task": "app.workers.tasks.cluster.nightly_rebuild",
        "schedule": crontab(minute=0, hour=3),
    },
    "datasource-poll-hourly": {
        "task": "app.workers.tasks.datasource_sync.poll_all",
        "schedule": crontab(minute=25),
    },
}
