import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { AnalyticsOverview, api, QuestionnaireOut } from "../api";
import { IndexPrepContext } from "../hooks/useIndexPrep";

type Activity = Awaited<ReturnType<typeof api.admin.recentActivity>>;

export default function DashboardPage() {
  const nav = useNavigate();
  // Shared hook — same state that drives the global banner in Layout, so the
  // Dashboard's index-readiness block updates in lockstep with the banner.
  const { indexStatus, refreshIndexStatus } = useOutletContext<IndexPrepContext>();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [activity, setActivity] = useState<Activity>([]);
  const [recentQ, setRecentQ] = useState<QuestionnaireOut[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [prepMsg, setPrepMsg] = useState<string | null>(null);

  const loadNonPrep = useCallback(async () => {
    const [ov, act, qs] = await Promise.all([
      api.analytics.overview().catch(() => null),
      api.admin.recentActivity(15).catch(() => []),
      api.questionnaires.list(5).catch(() => []),
    ]);
    setOverview(ov);
    setActivity(act);
    setRecentQ(qs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      await loadNonPrep();
      if (!cancelled) {
        timer = window.setTimeout(poll, document.hidden ? 60_000 : 30_000);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [loadNonPrep]);

  const prepare = useCallback(async () => {
    setPreparing(true);
    setPrepMsg(null);
    try {
      const r = await api.admin.prepareIndex();
      if (!r.ok) {
        setPrepMsg(r.reason ?? "prepare failed");
      } else {
        await refreshIndexStatus().catch(() => undefined);
        // The Layout's global PrepBanner takes over from here — no need to
        // block on this page or hold local polling loops.
        setPrepMsg("Indexing jobs queued. Progress is shown in the top banner and updates live across every page.");
      }
    } finally { setPreparing(false); }
  }, [refreshIndexStatus]);

  const llmReady = Boolean(indexStatus?.llm_configured ?? indexStatus?.google_api_key_set);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trust Copilot dashboard</h1>
          <p className="text-slate-600 mt-1">
            {overview?.hours_saved
              ? `${overview.hours_saved.toFixed(1)} analyst hours saved so far · `
              : ""}
            {indexStatus?.ready_for_demo
              ? "Index is healthy and ready."
              : "Index setup pending — click Prepare index below."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => nav("/questionnaires")}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            📋 Answer a questionnaire
          </button>
          <button
            onClick={prepare}
            disabled={preparing || !llmReady}
            className="px-3 py-2 rounded border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50"
            title={llmReady ? "Runs embed + mapping + merge suggest + conflict scan + compliance crawl" : "Set LLM_BASE_URL in .env first"}
          >
            {preparing ? "Preparing…" : "⚡ Prepare index"}
          </button>
        </div>
      </div>

      {prepMsg && (
        <div className="rounded bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 text-sm">
          {prepMsg}
        </div>
      )}

      {!llmReady && (
        <div className="rounded bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-sm">
          <b>No LLM endpoint is configured.</b> Set <code className="text-xs bg-amber-100 px-1 rounded">LLM_BASE_URL</code> in <code className="text-xs bg-amber-100 px-1 rounded">v2/.env</code> and restart the API and worker to enable drafting and mapping.
        </div>
      )}

      {/* Top-line KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Hours saved" value={overview.hours_saved.toFixed(1)} sub="at 6 min / question" accent="green" />
          <KPI label="Auto-answer rate" value={`${(overview.auto_answer_rate * 100).toFixed(0)}%`}
               sub={`${overview.items_approved} / ${overview.items_total} approved`} accent="blue" />
          <KPI label="Avg confidence" value={`${(overview.avg_confidence * 100).toFixed(0)}%`}
               sub="across all drafts" accent="indigo" />
          <KPI label="Open items" value={overview.conflicts_open}
               sub={overview.conflicts_open > 0 ? "conflicts need review" : "library is clean"}
               accent={overview.conflicts_open > 0 ? "amber" : "slate"} />
        </div>
      )}

      {/* Index readiness meter */}
      {indexStatus && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm font-medium text-slate-800 mb-3">Index readiness</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <MiniReady label="Library indexed" ok={indexStatus.embeddings_count > 0}
                       detail={`${indexStatus.embeddings_count} / ${indexStatus.entries_active}`} />
            <MiniReady label="Frameworks embedded"
                       ok={indexStatus.framework_controls_embedded === indexStatus.framework_controls_total && indexStatus.framework_controls_total > 0}
                       detail={`${indexStatus.framework_controls_embedded} / ${indexStatus.framework_controls_total}`} />
            <MiniReady label="Mapped entries" ok={indexStatus.entries_with_mappings > 0}
                       detail={`${indexStatus.entries_with_mappings} mapped`} />
            <MiniReady label="Compliance sources" ok={indexStatus.compliance_sources > 0}
                       detail={`${indexStatus.compliance_sources} watched`} />
          </div>
        </div>
      )}

      {/* Two-column: recent questionnaires + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-slate-800">Recent questionnaires</div>
            <Link to="/questionnaires" className="text-xs text-blue-600 hover:underline">Upload new →</Link>
          </div>
          {recentQ.length === 0 && (
            <div className="text-sm text-slate-400 py-4">
              No questionnaires yet. Try one from{" "}
              <Link to="/questionnaires" className="text-blue-600 hover:underline">the upload page</Link>.
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {recentQ.map((q) => (
              <Link
                key={q.id}
                to={`/questionnaires/${q.id}/review`}
                className="block py-3 hover:bg-slate-50 px-2 -mx-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <StatusPill status={q.status} />
                  <span className="text-xs text-slate-400">{_ago(q.created_at)}</span>
                </div>
                <div className="mt-1 text-sm font-medium text-slate-800 truncate">{q.name}</div>
                <div className="text-xs text-slate-500">
                  {q.customer ? `${q.customer} · ` : ""}{q.total_items} questions · {q.file_kind.toUpperCase()}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm font-medium text-slate-800 mb-3">Recent activity</div>
          {activity.length === 0 && (
            <div className="text-sm text-slate-400 py-4">Nothing to show yet.</div>
          )}
          <div className="divide-y divide-slate-100">
            {activity.slice(0, 12).map((a, i) => (
              <Link
                key={i}
                to={a.href}
                className="block py-3 hover:bg-slate-50 px-2 -mx-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <ActivityIcon kind={a.kind} />
                  <span className="text-xs text-slate-400">{_ago(a.ts)}</span>
                </div>
                <div className="mt-1 text-sm text-slate-800">{a.title}</div>
                <div className="text-xs text-slate-500 line-clamp-1">{a.subtitle}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction to="/questionnaires" title="Answer questionnaire" hint="Upload xlsx/docx/pdf" emoji="📋" />
        <QuickAction to="/library-health" title="Library health" hint={`${indexStatus?.conflicts_open ?? 0} conflicts`} emoji="🩺" />
        <QuickAction to="/analytics" title="Analytics" hint="Live metrics" emoji="📊" />
        <QuickAction to="/compliance" title="Auto-crawler" hint="Compliance sources" emoji="🌐" />
      </div>
    </div>
  );
}


// ── little pieces ──────────────────────────────────────────────

function KPI({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  const map: Record<string, string> = {
    green: "border-l-green-500",
    blue: "border-l-blue-500",
    indigo: "border-l-indigo-500",
    amber: "border-l-amber-500",
    slate: "border-l-slate-300",
  };
  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${map[accent]} p-4`}>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniReady({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${ok ? "bg-green-500" : "bg-slate-300"}`} />
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-800">{detail}</div>
    </div>
  );
}

function QuickAction({ to, title, hint, emoji }: { to: string; title: string; hint: string; emoji: string }) {
  return (
    <Link to={to} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-400 hover:shadow-sm transition">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{title}</div>
      <div className="text-xs text-slate-500">{hint}</div>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    parsing: "bg-slate-100 text-slate-700",
    drafting: "bg-amber-100 text-amber-800",
    ready_for_review: "bg-blue-100 text-blue-700",
    in_review: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    questionnaire_uploaded: "📋",
    conflict_detected: "⚠️",
    merge_suggested: "🔀",
  };
  return <span className="text-base">{map[kind] ?? "•"}</span>;
}

function _ago(iso: string): string {
  const d = new Date(iso);
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
