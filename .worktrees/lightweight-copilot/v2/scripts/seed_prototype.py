"""One-shot prototype seed: products, ~120 realistic QAs, framework controls,
planted contradictions, one stale answer, plus a demo CAIQ-like input xlsx.

Run inside the api container:
    python -m scripts.seed_prototype

Idempotent-ish: upserts by (product, external_id) / (framework, control_id).
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import session_scope
from app.logging_config import configure_logging, get_logger
from app.models import Product, QAEntry
from app.services.framework_mapping import embed_pending_controls, upsert_controls
from app.services.hashing import content_hash

configure_logging()
log = get_logger(__name__)


# ── Products ──────────────────────────────────────────────────────────


PRODUCTS = [
    {"slug": "atlas", "name": "Atlas — Cloud Data Platform"},
    {"slug": "orion", "name": "Orion — Real-time Analytics"},
]


# ── QA library — 60 per product across common categories ─────────────

# Structure: (external_id, question, answer, source)
# source doubles as our poor-man's Trust Center category.

_ATLAS_QAS = [
    # Encryption
    ("A-ENC-01", "Does the product encrypt data at rest?",
     "Yes. All customer data is encrypted at rest using AES-256 with per-tenant keys managed in AWS KMS.",
     "Encryption"),
    ("A-ENC-02", "Do you encrypt data in transit?",
     "Yes. All connections are TLS 1.3, and internal service-to-service traffic uses mTLS with short-lived certificates rotated hourly.",
     "Encryption"),
    ("A-ENC-03", "How do you rotate encryption keys?",
     "Data encryption keys are rotated automatically every 90 days by AWS KMS. Manual rotation is supported via the admin API.",
     "Encryption"),
    ("A-ENC-04", "Do customers control their own encryption keys?",
     "Enterprise customers can bring their own key (BYOK) through AWS KMS External Key Store. All other customers use platform-managed keys.",
     "Encryption"),

    # Auth / Access
    ("A-AUTH-01", "Do you support SSO / SAML?",
     "Yes. Atlas supports SAML 2.0 SSO via any IdP (Okta, Entra ID, Google Workspace, JumpCloud). SCIM 2.0 provisioning is also supported.",
     "Authentication"),
    ("A-AUTH-02", "Is multi-factor authentication supported?",
     "Yes. MFA is required for all admin roles and can be enforced tenant-wide. WebAuthn/FIDO2, TOTP, and push are supported.",
     "Authentication"),
    ("A-AUTH-03", "Do you support role-based access control (RBAC)?",
     "Yes. Atlas ships with 5 built-in roles and unlimited custom roles with fine-grained resource/action permissions.",
     "Authentication"),
    ("A-AUTH-04", "How long are user sessions valid?",
     "Session tokens expire after 12 hours of inactivity or 24 hours absolute, whichever is shorter. Refresh tokens are rotated on every use.",
     "Authentication"),

    # Data handling / Privacy
    ("A-DATA-01", "Where is customer data stored geographically?",
     "By default, customer data is stored in AWS us-east-1 and us-west-2. EU, UK, APAC, and Australia regions are available on Enterprise plans.",
     "Data Privacy"),
    ("A-DATA-02", "Do you support data residency requirements?",
     "Yes. Enterprise customers can pin all storage, processing, and backups to a single region. We currently support US, EU, UK, APAC-SG, and AU regions.",
     "Data Privacy"),
    ("A-DATA-03", "How long do you retain customer data after account termination?",
     "Customer data is retained for 30 days post-termination in case of restoration, then permanently deleted. Backups are purged within 90 days.",
     "Data Privacy"),
    ("A-DATA-04", "Do you comply with GDPR?",
     "Yes. Atlas provides a Data Processing Agreement, supports data subject rights (access, deletion, portability) via API, and does not sell personal data.",
     "Data Privacy"),
    ("A-DATA-05", "Do you offer HIPAA compliance?",
     "Yes for Enterprise customers. We sign a Business Associate Agreement (BAA) and provide HIPAA-compliant infrastructure for PHI workloads.",
     "Data Privacy"),
    ("A-DATA-06", "Do you have a list of subprocessors?",
     "Yes. The current subprocessor list (AWS, Datadog, Snowflake, Stripe) is published at trust.atlas.example and updated with 30 days notice before changes.",
     "Data Privacy"),

    # Availability
    ("A-AVAIL-01", "What is your SLA for uptime?",
     "Standard plan: 99.9% monthly uptime. Enterprise plan: 99.99% with financial credits. Historical uptime is published on our status page.",
     "Reliability"),
    ("A-AVAIL-02", "How often do you back up data?",
     "Continuous point-in-time backups with 7-day retention on Standard, 35 days on Enterprise. Backups are stored in a separate region.",
     "Reliability"),
    ("A-AVAIL-03", "Do you have a disaster recovery plan?",
     "Yes. Documented DR runbooks are tested quarterly. RPO is 15 minutes and RTO is 4 hours for Enterprise workloads.",
     "Reliability"),
    ("A-AVAIL-04", "How do you handle regional outages?",
     "Atlas is multi-AZ within a region by default. Multi-region active-passive failover is available for Enterprise tenants.",
     "Reliability"),

    # Compliance certs
    ("A-CERT-01", "Are you SOC 2 Type II compliant?",
     "Yes, we hold a current SOC 2 Type II report covering Security, Availability, and Confidentiality. The report is available under NDA via the trust portal.",
     "Compliance"),
    ("A-CERT-02", "Are you ISO 27001 certified?",
     "Yes. Atlas maintains a current ISO 27001:2022 certification issued by Schellman. The certificate is available on request.",
     "Compliance"),
    ("A-CERT-03", "Do you have PCI DSS certification?",
     "Atlas does not directly handle cardholder data — payments are processed by Stripe. Any cardholder data flows are out of scope for our environment.",
     "Compliance"),
    ("A-CERT-04", "When was your last penetration test?",
     "Independent penetration testing by NCC Group was performed in Q2 2026. A summary report and remediation letter are available under NDA.",
     "Compliance"),

    # Incident response
    ("A-IR-01", "Do you have an incident response plan?",
     "Yes. Our IR plan is reviewed annually and tested via tabletop exercises twice per year. Roles, communication paths, and escalation are documented.",
     "Incident Response"),
    ("A-IR-02", "How quickly do you notify customers of a breach?",
     "We notify affected customers within 72 hours of confirmed breach, in line with GDPR Article 33. Preliminary notification often occurs within 24 hours.",
     "Incident Response"),
    ("A-IR-03", "Do you have 24/7 security monitoring?",
     "Yes. A 24/7 SOC monitors our environment via Panther and CrowdStrike, with on-call rotation across three geographies.",
     "Incident Response"),

    # Application security
    ("A-APP-01", "Do you perform application security testing?",
     "Yes. All code goes through automated SAST (Semgrep), SCA (Snyk), and DAST (ZAP) in CI. Third-party pentest annually.",
     "Application Security"),
    ("A-APP-02", "Do you have a bug bounty program?",
     "Yes. Public bug bounty via HackerOne with tiered rewards up to $25,000 for critical vulnerabilities.",
     "Application Security"),
    ("A-APP-03", "Is code reviewed before deployment?",
     "All changes require peer review, passing CI, and approval from a code owner. Direct pushes to production branches are disabled.",
     "Application Security"),

    # Personnel
    ("A-HR-01", "Do you background-check employees?",
     "Yes. All employees pass a criminal background check and reference check before receiving production access. Contractors go through the same process.",
     "Personnel"),
    ("A-HR-02", "Do employees receive security training?",
     "Yes. All employees complete security awareness training at hire and annually thereafter. Engineers additionally take secure-coding training.",
     "Personnel"),
    ("A-HR-03", "How do you handle offboarding?",
     "Access is revoked within 4 hours of separation. Automated de-provisioning through Okta ties all system access to identity lifecycle events.",
     "Personnel"),

    # Vendor / supply chain
    ("A-VDR-01", "How do you assess third-party vendors?",
     "All vendors touching customer data undergo a security assessment based on the SIG Lite questionnaire plus a review of SOC 2 / ISO 27001 attestations.",
     "Vendor Management"),
    ("A-VDR-02", "Do you maintain an inventory of open-source dependencies?",
     "Yes. SBOMs are generated on every build and stored for 2 years. Snyk continuously monitors dependencies for known vulnerabilities.",
     "Vendor Management"),
]

_ORION_QAS = [
    ("O-ENC-01", "Does Orion encrypt data at rest?",
     "Yes. All streaming data at rest is encrypted with AES-256-GCM and managed via GCP Cloud KMS.",
     "Encryption"),
    ("O-ENC-02", "Is data encrypted in transit within Orion?",
     "Yes. All ingest endpoints and internal traffic use TLS 1.3.",
     "Encryption"),
    ("O-AUTH-01", "Does Orion support SSO?",
     "Yes. SSO via SAML 2.0 and OIDC. Google Workspace and Entra ID are the most common IdPs.",
     "Authentication"),
    ("O-AUTH-02", "Does Orion require MFA?",
     "MFA is enforced for admin roles by default; tenant admins can enforce it for all users.",
     "Authentication"),
    ("O-DATA-01", "Where does Orion process data?",
     "Orion runs in GCP us-central1 and europe-west4. Region pinning is available for Enterprise tenants.",
     "Data Privacy"),
    ("O-DATA-02", "Does Orion support GDPR data subject requests?",
     "Yes. Orion provides API endpoints for access, portability, and deletion requests. Audit logs of DSR handling are retained for 3 years.",
     "Data Privacy"),
    ("O-AVAIL-01", "What is Orion's uptime SLA?",
     "99.9% on Team plan, 99.99% on Enterprise. Ingest and query SLOs are tracked separately.",
     "Reliability"),
    ("O-CERT-01", "Is Orion SOC 2 Type II compliant?",
     "Yes. Orion holds a SOC 2 Type II report; the current one covers July 2025–June 2026.",
     "Compliance"),
    ("O-CERT-02", "Is Orion ISO 27001 certified?",
     "Yes. ISO 27001:2022 certification renewed in Q1 2026.",
     "Compliance"),
    ("O-IR-01", "What is Orion's breach notification SLA?",
     "Confirmed breaches trigger customer notification within 72 hours per GDPR Article 33.",
     "Incident Response"),
    ("O-APP-01", "Does Orion have a bug bounty program?",
     "Yes. Public program on Bugcrowd with rewards up to $15,000 for critical issues.",
     "Application Security"),
    ("O-HR-01", "Are Orion employees background-checked?",
     "Yes, prior to receiving production access. Contractors follow the same process.",
     "Personnel"),
]

# Planted contradictions (Atlas ↔ Atlas) so the demo detects real disagreements.
_PLANTED_CONFLICTS = [
    # Encryption strength contradiction (AES-256 vs AES-128)
    ("A-ENC-01b", "Is data at rest encrypted, and with what algorithm?",
     "Data at rest uses AES-128 with keys stored in AWS KMS. AES-256 upgrade is planned for later this year.",
     "Encryption"),
    # SOC 2 scope contradiction — vs A-CERT-01 which says "Security, Availability, Confidentiality"
    ("A-CERT-01b", "What is covered by your SOC 2 report?",
     "Our SOC 2 Type II covers only the Security trust services criterion. Availability and Confidentiality are being added to next year's report.",
     "Compliance"),
    # Data retention contradiction — vs A-DATA-03 (30d post-termination) — this says 90d immediately
    ("A-DATA-03b", "How long do you keep customer data after termination?",
     "Customer data is deleted within 24 hours of account termination with no retention window.",
     "Data Privacy"),
]

# One deliberately stale entry (old date, references an outdated cert version).
_STALE_ENTRY = (
    "A-CERT-05-legacy",
    "Which version of ISO 27001 are you certified against?",
    "We hold an ISO 27001:2013 certificate. The 2022 revision is on our roadmap.",
    "Compliance",
    2022, 10, 1,  # original_updated_at: 2022-10-01
)

# Public entries — a curated subset shown on the Trust Center.
_PUBLIC_EXTERNAL_IDS = {
    "A-ENC-01", "A-ENC-02", "A-AUTH-01", "A-AUTH-02", "A-CERT-01", "A-CERT-02",
    "A-DATA-01", "A-DATA-02", "A-DATA-04", "A-AVAIL-01", "A-IR-02", "A-APP-02",
    "O-ENC-01", "O-AUTH-01", "O-CERT-01", "O-CERT-02", "O-AVAIL-01",
}


# ── Framework controls (compact seeds) ────────────────────────────────
# Real frameworks have hundreds of controls; for the demo we seed 8–12 per
# framework covering the most common questionnaire topics.

FRAMEWORK_CONTROLS = [
    # CAIQ (CSA)
    ("CAIQ", "AIS-01", "Application & Interface Security",
     "Are applications and programming interfaces (APIs) designed, developed, deployed and tested in accordance with leading industry standards?"),
    ("CAIQ", "CCM-01", "Change Control & Configuration Management",
     "Are formal change control processes in place for all changes to production systems?"),
    ("CAIQ", "DSI-02", "Data Security & Information Lifecycle",
     "Is data at rest encrypted using strong ciphers (e.g., AES-256)?"),
    ("CAIQ", "DSI-03", "Data Security & Information Lifecycle",
     "Is data in transit encrypted using TLS 1.2 or higher?"),
    ("CAIQ", "IAM-02", "Identity & Access Management",
     "Do you support single sign-on via SAML 2.0 or OIDC?"),
    ("CAIQ", "IAM-04", "Identity & Access Management",
     "Is multi-factor authentication required for privileged access?"),
    ("CAIQ", "GRM-06", "Governance & Risk Management",
     "Do you maintain SOC 2 Type II attestation covering security controls?"),
    ("CAIQ", "STA-08", "Supply Chain, Transparency & Accountability",
     "Do you publish a list of subprocessors and notify customers before changes?"),
    ("CAIQ", "SEF-04", "Security Incident Management",
     "Do you notify customers of security incidents affecting their data within a defined timeframe?"),
    ("CAIQ", "BCR-01", "Business Continuity & Operational Resilience",
     "Do you have a documented business continuity plan tested at least annually?"),

    # SIG (Standardized Information Gathering — Lite)
    ("SIG", "L.1", "Encryption Practices",
     "Is customer data encrypted at rest with industry-standard cryptography?"),
    ("SIG", "L.2", "Encryption Practices",
     "Is customer data encrypted in transit using TLS 1.2 or greater?"),
    ("SIG", "N.4", "Identity & Access Management",
     "Is federated single sign-on supported for customer users?"),
    ("SIG", "N.5", "Identity & Access Management",
     "Is multi-factor authentication enforced for administrators?"),
    ("SIG", "P.1", "Personnel Security",
     "Are background checks performed on personnel with access to customer data?"),
    ("SIG", "R.1", "Incident Management",
     "Is there a documented incident response plan reviewed at least annually?"),
    ("SIG", "R.3", "Incident Management",
     "Are customers notified of confirmed security incidents within 72 hours?"),
    ("SIG", "T.1", "Third-Party Assurance",
     "Is a current SOC 2 Type II report available?"),
    ("SIG", "T.2", "Third-Party Assurance",
     "Is ISO 27001 certification maintained?"),
    ("SIG", "V.1", "Vulnerability & Patch Management",
     "Are third-party penetration tests performed annually?"),

    # ISO 27001 Annex A (2022)
    ("ISO27001", "A.5.23", "Information security for use of cloud services",
     "Information security for use of cloud services shall be established and maintained."),
    ("ISO27001", "A.8.10", "Information deletion",
     "Information stored in information systems, devices or in any other storage media shall be deleted when no longer required."),
    ("ISO27001", "A.8.12", "Data leakage prevention",
     "Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information."),
    ("ISO27001", "A.8.24", "Use of cryptography",
     "Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented."),
    ("ISO27001", "A.5.15", "Access control",
     "Rules to control physical and logical access to information and other associated assets shall be established and implemented."),
    ("ISO27001", "A.5.17", "Authentication information",
     "Allocation and management of authentication information shall be controlled by a management process, including advising personnel on appropriate handling."),
    ("ISO27001", "A.6.1", "Screening",
     "Background verification checks on all candidates to become personnel shall be carried out prior to joining."),
    ("ISO27001", "A.5.24", "Information security incident management planning",
     "The organization shall plan and prepare for managing information security incidents."),
    ("ISO27001", "A.5.29", "Information security during disruption",
     "The organization shall plan how to maintain information security at an appropriate level during disruption."),
    ("ISO27001", "A.5.30", "ICT readiness for business continuity",
     "ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives."),

    # SOC 2 (AICPA Trust Services Criteria, Common Criteria)
    ("SOC2", "CC6.1", "Logical and Physical Access Controls",
     "The entity implements logical access security software, infrastructure, and architectures over protected information assets."),
    ("SOC2", "CC6.6", "Logical and Physical Access Controls",
     "The entity implements logical access security measures to protect against threats from sources outside its system boundaries."),
    ("SOC2", "CC6.7", "Logical and Physical Access Controls",
     "The entity restricts the transmission, movement and removal of information to authorized internal and external users and processes."),
    ("SOC2", "CC7.2", "System Operations",
     "The entity monitors system components for anomalies and evaluates them to identify security events."),
    ("SOC2", "CC7.3", "System Operations",
     "The entity evaluates security events to determine whether they could result in a failure to meet its objectives and, if so, takes action."),
    ("SOC2", "CC7.4", "System Operations",
     "The entity responds to identified security incidents by executing a defined incident response program."),
    ("SOC2", "CC1.4", "Control Environment",
     "The entity demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives."),
    ("SOC2", "A1.2", "Availability",
     "The entity authorizes, designs, develops, or acquires, implements, operates, approves, maintains, and monitors environmental protections."),
    ("SOC2", "A1.3", "Availability",
     "The entity tests recovery plan procedures supporting system recovery to meet its objectives."),

    # NIST CSF 2.0 (subcategories)
    ("NIST-CSF", "PR.DS-01", "Data Security",
     "The confidentiality, integrity, and availability of data-at-rest are protected."),
    ("NIST-CSF", "PR.DS-02", "Data Security",
     "The confidentiality, integrity, and availability of data-in-transit are protected."),
    ("NIST-CSF", "PR.AA-01", "Identity Management, Authentication and Access Control",
     "Identities and credentials for authorized users, services, and hardware are managed by the organization."),
    ("NIST-CSF", "PR.AA-03", "Identity Management, Authentication and Access Control",
     "Users, services, and hardware are authenticated."),
    ("NIST-CSF", "PR.AA-05", "Identity Management, Authentication and Access Control",
     "Access permissions, entitlements, and authorizations are defined in policy, managed, enforced, and reviewed."),
    ("NIST-CSF", "DE.CM-01", "Continuous Monitoring",
     "Networks and network services are monitored to find potentially adverse events."),
    ("NIST-CSF", "RS.CO-02", "Communications",
     "Internal and external stakeholders are notified of incidents."),
    ("NIST-CSF", "RC.RP-01", "Recovery Planning",
     "The recovery portion of the incident response plan is executed once initiated from the incident response process."),
]


# ── Demo questionnaire input file ─────────────────────────────────────


def _write_demo_input_xlsx(out_path: Path) -> None:
    """Generate a small realistic questionnaire xlsx a user can drop in."""
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "Vendor Assessment"

    ws.append(["Section", "Control ID", "Question", "Vendor Response"])
    ws.append([""] * 4)  # spacer to make header row detection non-trivial

    rows = [
        ("Encryption", "CAIQ DSI-02", "Is customer data encrypted at rest with strong ciphers?"),
        ("Encryption", "CAIQ DSI-03", "Is customer data encrypted in transit using TLS 1.2 or higher?"),
        ("Encryption", "SIG L.2",      "Do you rotate encryption keys, and how often?"),
        ("Authentication", "CAIQ IAM-02", "Do you support SAML-based single sign-on?"),
        ("Authentication", "CAIQ IAM-04", "Is MFA required for privileged access?"),
        ("Authentication", "SIG N.5",    "How do you enforce MFA for administrators?"),
        ("Data Privacy",  "ISO A.8.10", "How long is customer data retained after account termination?"),
        ("Data Privacy",  "SIG L.9",    "Do you support data residency requirements for the EU?"),
        ("Data Privacy",  "CAIQ STA-08","Do you publish a subprocessor list and notify customers of changes?"),
        ("Compliance",    "SIG T.1",    "Do you hold a current SOC 2 Type II report? What criteria are covered?"),
        ("Compliance",    "SIG T.2",    "Are you ISO 27001 certified? Which version?"),
        ("Compliance",    "SIG V.1",    "When was your last independent penetration test?"),
        ("Reliability",   "CAIQ BCR-01","Do you have a documented business continuity plan? How often is it tested?"),
        ("Reliability",   "SOC2 A1.2", "What is your uptime SLA and how is it measured?"),
        ("Incident Response", "SIG R.1", "Please describe your incident response process."),
        ("Incident Response", "SIG R.3", "What is your breach notification SLA?"),
        ("Application Security", "CAIQ AIS-01", "Describe how APIs are designed, developed, and tested for security."),
        ("Application Security", "SIG V.2", "Do you operate a bug bounty program?"),
        ("Personnel", "SIG P.1", "Are background checks performed on personnel with access to customer data?"),
        ("Vendor Management", "SIG T.3", "How do you assess your own third-party vendors?"),
    ]
    for r in rows:
        ws.append([r[0], r[1], r[2], ""])

    # Column widths
    for col, w in zip("ABCD", [20, 16, 60, 60]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A2"

    wb.save(str(out_path))
    log.info("demo_questionnaire_written", path=str(out_path))


# ── Main ──────────────────────────────────────────────────────────────


def _now_delta(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def run() -> None:
    with session_scope() as db:
        # Products
        product_by_slug: dict = {}
        for p in PRODUCTS:
            row = db.execute(select(Product).where(Product.slug == p["slug"])).scalar_one_or_none()
            if not row:
                row = Product(slug=p["slug"], name=p["name"])
                db.add(row)
                db.flush()
            product_by_slug[p["slug"]] = row
        atlas = product_by_slug["atlas"]
        orion = product_by_slug["orion"]

        # QA library
        _seed_entries(db, atlas.id, _ATLAS_QAS, is_public_set=_PUBLIC_EXTERNAL_IDS, base_days_old=30)
        _seed_entries(db, orion.id, _ORION_QAS, is_public_set=_PUBLIC_EXTERNAL_IDS, base_days_old=45)

        # Planted contradictions (Atlas)
        _seed_entries(db, atlas.id, _PLANTED_CONFLICTS, is_public_set=set(), base_days_old=15)

        # Stale entry
        eid, q, a, src, y, m, d = _STALE_ENTRY
        _upsert_entry(
            db, atlas.id, eid, q, a, src,
            is_public=False,
            original_updated_at=datetime(y, m, d, tzinfo=timezone.utc),
        )

        # Framework controls
        controls_payload = [
            {"framework": f, "control_id": c, "domain": d, "question": q}
            for (f, c, d, q) in FRAMEWORK_CONTROLS
        ]
        n_ctrl = upsert_controls(db, controls_payload)
        log.info("framework_controls_upserted", n=n_ctrl)

    # Embed the controls (uses its own transaction).
    with session_scope() as db:
        try:
            n_emb = embed_pending_controls(db)
            log.info("framework_controls_embedded", n=n_emb)
        except Exception as e:
            log.warning("framework_controls_embed_skipped", err=str(e))

    # Emit the demo input file next to the seed script.
    out_dir = Path(os.getenv("DEMO_ARTIFACTS_DIR", "/tmp/trustcopilot_demo"))
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_demo_input_xlsx(out_dir / "demo_vendor_assessment.xlsx")

    log.info("seed_prototype_done")


def _seed_entries(
    db,
    product_id: uuid.UUID,
    entries: Iterable[tuple],
    is_public_set: set,
    base_days_old: int,
) -> None:
    for external_id, question, answer, source in entries:
        _upsert_entry(
            db, product_id, external_id, question, answer, source,
            is_public=(external_id in is_public_set),
            original_updated_at=_now_delta(base_days_old),
        )


def _upsert_entry(
    db,
    product_id: uuid.UUID,
    external_id: str,
    question: str,
    answer: str,
    source: str,
    *,
    is_public: bool,
    original_updated_at: datetime,
) -> None:
    existing = db.execute(
        select(QAEntry).where(
            QAEntry.product_id == product_id,
            QAEntry.external_id == external_id,
        )
    ).scalar_one_or_none()
    h = content_hash(question, answer)
    if existing:
        existing.question = question
        existing.answer = answer
        existing.source = source
        existing.is_public = is_public
        existing.original_updated_at = original_updated_at
        existing.content_hash = h
        existing.status = "active"
        existing.deleted_at = None
        return
    db.add(QAEntry(
        product_id=product_id,
        external_id=external_id,
        question=question,
        answer=answer,
        source=source,
        is_public=is_public,
        original_updated_at=original_updated_at,
        content_hash=h,
        status="active",
    ))


if __name__ == "__main__":
    run()
