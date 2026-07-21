"""Build a reproducible, evidence-labelled investor-pitch dataset.

Run after migrations from the API container:
    python -m scripts.seed_pitch_demo

It imports selected NIST OSCAL controls, the pinned OWASP ASVS 5.0.0 CSV, and
a small CISA KEV snapshot. All Q&A answers are explicitly simulated policies,
not claims about any real vendor.
"""

from __future__ import annotations

import csv
import io
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import httpx
from openpyxl import Workbook
from sqlalchemy import select

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import (
    ComplianceSource,
    DataSource,
    DataSourceFile,
    LibraryConflict,
    MergeQueue,
    Product,
    QAEntry,
)
from app.services.framework_mapping import embed_pending_controls, upsert_controls
from app.services.hashing import content_hash

log = get_logger(__name__)

PRODUCT_SLUG = "pitch-atlas"
PRODUCT_NAME = "Atlas — Simulated Security Program"
PITCH_ROOT = Path(os.getenv("DEMO_ARTIFACTS_DIR", "/tmp/trustcopilot_demo")) / "pitch-data"

OWASP_ASVS_URL = (
    "https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/"
    "OWASP_Application_Security_Verification_Standard_5.0.0_en.csv"
)
NIST_800_53_URL = (
    "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/"
    "SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json"
)
CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

NIST_CONTROL_IDS = {
    "ac-2", "ac-3", "ac-6", "at-2", "au-2", "au-6", "cm-2", "cm-3",
    "cp-2", "cp-9", "ia-2", "ia-5", "ir-4", "ir-5", "ra-5", "sc-7",
    "sc-8", "sc-12", "sc-13", "si-2", "si-3", "si-4", "si-10", "si-12",
}
ASVS_PREFIXES = ("V3.", "V4.", "V6.", "V7.", "V8.", "V9.", "V11.", "V12.", "V14.")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _fetch(url: str) -> bytes:
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        response = client.get(url, headers={"User-Agent": "trust-copilot-pitch-seed/1.0"})
        response.raise_for_status()
        return response.content


def _write_snapshot(filename: str, content: bytes) -> Path:
    PITCH_ROOT.mkdir(parents=True, exist_ok=True)
    path = PITCH_ROOT / filename
    path.write_bytes(content)
    return path


def _part_text(parts: Iterable[dict[str, Any]]) -> str:
    chunks: list[str] = []
    for part in parts or []:
        for prose in part.get("prose", []) or []:
            text = " ".join(str(prose).split())
            if text:
                chunks.append(text)
        nested = _part_text(part.get("parts", []))
        if nested:
            chunks.append(nested)
    return " ".join(chunks)


def _walk_controls(groups: Iterable[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    for group in groups or []:
        yield from group.get("controls", []) or []
        yield from _walk_controls(group.get("groups", []) or [])


def _nist_controls(payload: bytes) -> list[dict[str, str]]:
    catalog = json.loads(payload)["catalog"]
    selected: list[dict[str, str]] = []
    for control in _walk_controls(catalog.get("groups", [])):
        control_id = control.get("id", "").lower()
        if control_id not in NIST_CONTROL_IDS:
            continue
        title = " ".join(str(control.get("title", "")).split())
        selected.append({
            "framework": "NIST-800-53",
            "control_id": control_id.upper(),
            "domain": "NIST SP 800-53 Rev. 5",
            "question": title or control_id.upper(),
            "description": _part_text(control.get("parts", []))[:900] or "NIST SP 800-53 control.",
        })
    missing = NIST_CONTROL_IDS - {control["control_id"].lower() for control in selected}
    if missing:
        raise RuntimeError(f"NIST source did not contain expected controls: {sorted(missing)}")
    return sorted(selected, key=lambda control: control["control_id"])


def _asvs_controls(payload: bytes) -> list[dict[str, str]]:
    rows = csv.DictReader(io.StringIO(payload.decode("utf-8-sig")))
    selected: list[dict[str, str]] = []
    for row in rows:
        req_id = (row.get("req_id") or "").strip()
        if not req_id.startswith(ASVS_PREFIXES):
            continue
        selected.append({
            "framework": "OWASP-ASVS",
            "control_id": f"v5.0.0-{req_id}",
            "domain": (row.get("section_name") or row.get("chapter_name") or "OWASP ASVS").strip(),
            "question": (row.get("req_description") or "").strip(),
            "description": f"OWASP ASVS 5.0.0; level {row.get('L', '').strip()}.",
        })
        if len(selected) == 36:
            break
    if len(selected) < 30:
        raise RuntimeError(f"Expected at least 30 ASVS controls, got {len(selected)}")
    return selected


def _kev_rows(payload: bytes) -> list[dict[str, str]]:
    vulnerabilities = json.loads(payload).get("vulnerabilities", [])
    vulnerabilities = sorted(vulnerabilities, key=lambda row: row.get("dateAdded", ""), reverse=True)[:12]
    rows: list[dict[str, str]] = []
    for row in vulnerabilities:
        cve = str(row.get("cveID", "")).strip()
        if not cve:
            continue
        name = str(row.get("vulnerabilityName", "vulnerability")).strip()
        vendor = str(row.get("vendorProject", "vendor")).strip()
        product = str(row.get("product", "product")).strip()
        action = " ".join(str(row.get("requiredAction", "")).split())
        rows.append({
            "external_id": f"KEV-{cve}",
            "question": f"How does the simulated program handle {cve} affecting {vendor} {product}?",
            "answer": (
                f"Demo policy: {cve} ({name}) is treated as an actively exploited vulnerability. "
                f"The assigned owner must triage it within one business day and track the required action: {action}"
            ),
            "source": "CISA KEV snapshot (pitch demonstration)",
            "original_updated_at": row.get("dateAdded", "") or _utcnow().date().isoformat(),
            "cve_id": cve,
            "vendor": vendor,
            "product": product,
            "date_added": row.get("dateAdded", ""),
            "due_date": row.get("dueDate", ""),
            "required_action": action,
        })
    if len(rows) < 8:
        raise RuntimeError("CISA KEV response contained too few usable records")
    return rows


SIMULATED_QAS = [
    ("PITCH-IAM-01", "How is privileged access managed?", "Demo policy: privileged access is role-based, approved by a system owner, protected by multi-factor authentication, and reviewed quarterly.", "Demo policy — NIST AC-2 / AC-6", True),
    ("PITCH-IAM-02", "How are user accounts provisioned and removed?", "Demo policy: user accounts require an approved request, follow least-privilege role assignment, and are removed promptly when employment or business need ends.", "Demo policy — NIST AC-2", True),
    ("PITCH-IAM-03", "How are authenticators protected?", "Demo policy: authentication secrets are managed through approved mechanisms, are not shared, and are rotated or revoked when compromise is suspected.", "Demo policy — NIST IA-5", False),
    ("PITCH-ENC-01", "How is customer data protected in transit?", "Demo policy: customer data in transit is protected by approved transport encryption. The protocol baseline is maintained in the platform security standard.", "Demo policy — NIST SC-8", True),
    ("PITCH-ENC-02", "How are cryptographic keys managed?", "Demo policy: encryption keys are created, stored, rotated, revoked, and destroyed using an approved key-management process.", "Demo policy — NIST SC-12 / SC-13", True),
    ("PITCH-LOG-01", "How are security events logged?", "Demo policy: security-relevant events are logged, reviewed through defined monitoring procedures, and retained according to the evidence-retention standard.", "Demo policy — NIST AU-2 / AU-6", True),
    ("PITCH-VULN-01", "How are vulnerabilities remediated?", "Demo policy: vulnerabilities are prioritized using exploitability, severity, and asset context. Critical issues require expedited remediation or a documented, time-bound exception.", "Demo policy — NIST RA-5 / SI-2", True),
    ("PITCH-IR-01", "How does the organization respond to security incidents?", "Demo policy: the incident-response process defines triage, containment, evidence preservation, communication, recovery, and post-incident improvement activities.", "Demo policy — NIST IR-4 / IR-5", True),
    ("PITCH-BC-01", "How is business continuity maintained?", "Demo policy: continuity and backup procedures are documented, tested on a schedule, and improved from exercise results.", "Demo policy — NIST CP-2 / CP-9", True),
    ("PITCH-SDLC-01", "How is the web application protected from common security flaws?", "Demo policy: the secure development lifecycle includes security requirements, code review, dependency review, testing, and remediation tracking before release.", "Demo policy — OWASP ASVS 5.0.0", True),
    ("PITCH-API-01", "How are APIs protected?", "Demo policy: APIs enforce authenticated access, validate inputs, limit exposure of sensitive data, and log security-relevant activity.", "Demo policy — OWASP ASVS 5.0.0", True),
    ("PITCH-SUPPLY-01", "How are third-party software dependencies managed?", "Demo policy: dependencies are inventoried, assessed for known vulnerabilities, updated according to risk, and subject to approved exceptions.", "Demo policy — NIST SI-2 / OpenSSF-aligned", False),
    ("PITCH-DUP-01", "Do administrators require multi-factor authentication?", "Demo policy: multi-factor authentication is required before privileged administrative access is granted.", "DEMO_DUPLICATE — NIST IA-2", False),
    ("PITCH-DUP-02", "Is MFA mandatory for administrative users?", "Demo policy: privileged administrator accounts must use multi-factor authentication before access is permitted.", "DEMO_DUPLICATE — NIST IA-2", False),
    ("PITCH-CONFLICT-01", "What is the critical-vulnerability remediation target?", "DEMO_CONFLICT: critical vulnerabilities are remediated within 30 calendar days.", "DEMO_CONFLICT — do not treat as policy", False),
    ("PITCH-CONFLICT-02", "What is the remediation target for critical vulnerabilities?", "DEMO_CONFLICT: critical vulnerabilities are remediated within 7 calendar days.", "DEMO_CONFLICT — do not treat as policy", False),
]


def _parse_date(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return _utcnow()


def _upsert_entry(db: Any, product_id: Any, external_id: str, question: str, answer: str, source: str, updated_at: datetime, is_public: bool) -> None:
    row = db.execute(select(QAEntry).where(QAEntry.product_id == product_id, QAEntry.external_id == external_id)).scalar_one_or_none()
    payload = {"question": question, "answer": answer, "source": source, "original_updated_at": updated_at, "content_hash": content_hash(question, answer, ""), "status": "active", "deleted_at": None, "is_public": is_public}
    if row:
        for key, value in payload.items():
            setattr(row, key, value)
    else:
        db.add(QAEntry(product_id=product_id, external_id=external_id, **payload))


def _write_kev_csv(rows: list[dict[str, str]]) -> Path:
    path = PITCH_ROOT / "kev_snapshot.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return path


def _write_questionnaire() -> Path:
    path = PITCH_ROOT / "pitch_vendor_assessment.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Security Assessment"
    sheet.append(["Section", "Control ID", "Question", "Vendor Response"])
    rows = [
        ("Identity & Access", "NIST AC-2", "How are user accounts provisioned and removed?"),
        ("Identity & Access", "NIST AC-6", "How is privileged access managed?"),
        ("Identity & Access", "NIST IA-2", "Is multi-factor authentication required for administrative users?"),
        ("Encryption", "NIST SC-8", "How is customer data protected in transit?"),
        ("Encryption", "NIST SC-12", "How are cryptographic keys managed?"),
        ("Monitoring", "NIST AU-6", "How are security events logged and reviewed?"),
        ("Vulnerability Management", "NIST RA-5", "How are vulnerabilities identified and prioritized?"),
        ("Incident Response", "NIST IR-4", "How does the organization respond to security incidents?"),
        ("Resilience", "NIST CP-9", "How are backups and recovery procedures tested?"),
        ("Application Security", "ASVS v5.0.0-V4", "How are APIs protected from unauthorized access and malformed input?"),
        ("Application Security", "ASVS v5.0.0-V3", "Which browser security controls are implemented?"),
        ("Supply Chain", "NIST SI-2", "How are third-party software dependencies managed?"),
        ("Coverage gap", "DEMO-GAP", "Do you maintain a current third-party audit report for every customer request?"),
    ]
    for row in rows:
        sheet.append([*row, ""])
    for column, width in zip("ABCD", [24, 22, 76, 76]):
        sheet.column_dimensions[column].width = width
    sheet.freeze_panes = "A2"
    workbook.save(path)
    return path


def _configure_kev_datasource(db: Any, product_id: Any, csv_path: Path) -> None:
    source = db.execute(select(DataSource).where(DataSource.product_id == product_id, DataSource.name == "CISA KEV pitch snapshot")).scalar_one_or_none()
    config = {"main_alias": "kev", "mapping": {"external_id": "external_id", "question": "question", "answer": "answer", "source": "source", "updated_at": "original_updated_at"}}
    if not source:
        source = DataSource(product_id=product_id, name="CISA KEV pitch snapshot", kind="csv_bundle", config=config, enabled=True, poll_interval_minutes=None)
        db.add(source)
        db.flush()
    else:
        source.config, source.enabled = config, True
    file = db.execute(select(DataSourceFile).where(DataSourceFile.data_source_id == source.id, DataSourceFile.alias == "kev")).scalar_one_or_none()
    values = {"filename": csv_path.name, "path": str(csv_path), "size_bytes": csv_path.stat().st_size}
    if file:
        for key, value in values.items():
            setattr(file, key, value)
    else:
        db.add(DataSourceFile(data_source_id=source.id, alias="kev", **values))


def _configure_compliance_source(db: Any) -> None:
    source = db.execute(select(ComplianceSource).where(ComplianceSource.url == CISA_KEV_URL)).scalar_one_or_none()
    if not source:
        db.add(ComplianceSource(name="CISA Known Exploited Vulnerabilities", url=CISA_KEV_URL, kind="http", poll_interval_minutes=60, enabled=True))


def _seed_review_queues(db: Any, product_id: Any) -> None:
    """Add explicit, labelled review artifacts so every pitch screen has content."""
    ids = dict(
        db.execute(
            select(QAEntry.external_id, QAEntry.id).where(
                QAEntry.product_id == product_id,
                QAEntry.external_id.in_({
                    "PITCH-DUP-01", "PITCH-DUP-02", "PITCH-CONFLICT-01", "PITCH-CONFLICT-02",
                }),
            )
        ).all()
    )
    primary_id, duplicate_id = ids["PITCH-DUP-01"], ids["PITCH-DUP-02"]
    merge = db.execute(
        select(MergeQueue).where(MergeQueue.product_id == product_id, MergeQueue.primary_qa_id == primary_id)
    ).scalar_one_or_none()
    if not merge:
        db.add(MergeQueue(
            product_id=product_id,
            primary_qa_id=primary_id,
            secondary_qa_ids=[duplicate_id],
            canonical_draft={
                "question": "Is multi-factor authentication required for privileged administrators?",
                "answer": "Demo policy: multi-factor authentication is required before privileged administrative access is granted.",
                "notes": ["Deliberately seeded pitch example; simulated policy only."],
            },
            llm_rationale="DEMO: near-duplicate privileged-access answers prepared for reviewer approval.",
            suggested_by="rule",
            status="pending",
        ))

    conflict_a, conflict_b = sorted([ids["PITCH-CONFLICT-01"], ids["PITCH-CONFLICT-02"]], key=str)
    conflict = db.execute(
        select(LibraryConflict).where(
            LibraryConflict.entry_a_id == conflict_a,
            LibraryConflict.entry_b_id == conflict_b,
        )
    ).scalar_one_or_none()
    if not conflict:
        db.add(LibraryConflict(
            entry_a_id=conflict_a,
            entry_b_id=conflict_b,
            severity="high",
            explanation="DEMO: intentionally conflicting 30-day and 7-day critical-vulnerability remediation targets.",
            status="open",
        ))


def run() -> None:
    configure_logging()
    log.info("pitch_seed_download_start")
    nist_payload, asvs_payload, kev_payload = _fetch(NIST_800_53_URL), _fetch(OWASP_ASVS_URL), _fetch(CISA_KEV_URL)
    _write_snapshot("nist_sp800_53_rev5_catalog.json", nist_payload)
    _write_snapshot("owasp_asvs_5.0.0.csv", asvs_payload)
    _write_snapshot("cisa_kev.json", kev_payload)
    nist_controls, asvs_controls, kev_rows = _nist_controls(nist_payload), _asvs_controls(asvs_payload), _kev_rows(kev_payload)
    kev_csv, questionnaire = _write_kev_csv(kev_rows), _write_questionnaire()

    with session_scope() as db:
        product = db.execute(select(Product).where(Product.slug == PRODUCT_SLUG)).scalar_one_or_none()
        if not product:
            product = Product(slug=PRODUCT_SLUG, name=PRODUCT_NAME)
            db.add(product)
            db.flush()
        else:
            product.name = PRODUCT_NAME
        for external_id, question, answer, source, is_public in SIMULATED_QAS:
            age = _utcnow() - timedelta(days=550 if external_id == "PITCH-BC-01" else 21)
            _upsert_entry(db, product.id, external_id, question, answer, source, age, is_public)
        for row in kev_rows:
            _upsert_entry(db, product.id, row["external_id"], row["question"], row["answer"], row["source"], _parse_date(row["original_updated_at"]), False)
        db.flush()
        _seed_review_queues(db, product.id)
        _configure_kev_datasource(db, product.id, kev_csv)
        _configure_compliance_source(db)
        n_controls = upsert_controls(db, nist_controls + asvs_controls)
        stale_entry_id = db.execute(
            select(QAEntry.id).where(QAEntry.product_id == product.id, QAEntry.external_id == "PITCH-BC-01")
        ).scalar_one()

    with session_scope() as db:
        try:
            embedded_controls = embed_pending_controls(db)
        except Exception as exc:
            embedded_controls = 0
            log.warning("pitch_control_embedding_deferred", err=str(exc))
    from app.workers.tasks.embed import embed_pending
    from app.workers.tasks.outdated_check import verify_entry
    embed_pending.delay()
    verify_entry.delay(str(stale_entry_id))
    log.info("pitch_seed_complete", product=PRODUCT_SLUG, qa_entries=len(SIMULATED_QAS) + len(kev_rows), nist_controls=len(nist_controls), asvs_controls=len(asvs_controls), controls_upserted=n_controls, controls_embedded=embedded_controls, questionnaire=str(questionnaire), kev_csv=str(kev_csv))


if __name__ == "__main__":
    run()
