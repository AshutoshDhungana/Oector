from fastapi import APIRouter

from app.api.v1 import (
    admin as admin_r,
    analytics as analytics_r,
    answer as answer_r,
    auth as auth_r,
    clusters as clusters_r,
    compliance as compliance_r,
    conflicts as conflicts_r,
    datasources as datasources_r,
    entries as entries_r,
    health as health_r,
    jobs as jobs_r,
    mappings as mappings_r,
    merge as merge_r,
    products as products_r,
    questionnaires as questionnaires_r,
    search as search_r,
    trust as trust_r,
    uploads as uploads_r,
)

router = APIRouter()
router.include_router(auth_r.router, prefix="/auth", tags=["auth"])
router.include_router(products_r.router, prefix="/products", tags=["products"])
router.include_router(entries_r.router, prefix="/entries", tags=["entries"])
router.include_router(clusters_r.router, prefix="/clusters", tags=["clusters"])
router.include_router(search_r.router, prefix="/search", tags=["search"])
router.include_router(answer_r.router, prefix="/answer", tags=["answer"])
router.include_router(questionnaires_r.router, prefix="/questionnaires", tags=["questionnaires"])
router.include_router(mappings_r.router, prefix="/mappings", tags=["mappings"])
router.include_router(conflicts_r.router, prefix="/conflicts", tags=["conflicts"])
router.include_router(admin_r.router, prefix="/admin", tags=["admin"])
router.include_router(analytics_r.router, prefix="/analytics", tags=["analytics"])
router.include_router(trust_r.router, prefix="/trust", tags=["trust"])
router.include_router(health_r.router, prefix="/health", tags=["health"])
router.include_router(merge_r.router, prefix="/merge", tags=["merge"])
router.include_router(compliance_r.router, prefix="/compliance", tags=["compliance"])
router.include_router(jobs_r.router, prefix="/jobs", tags=["jobs"])
router.include_router(uploads_r.router, prefix="/uploads", tags=["uploads"])
router.include_router(datasources_r.router, prefix="/datasources", tags=["datasources"])
