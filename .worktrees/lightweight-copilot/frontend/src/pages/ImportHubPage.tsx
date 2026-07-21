import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

type Method = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  status: "live" | "beta" | "waitlist";
  action: () => void;
};

export default function ImportHubPage() {
  const nav = useNavigate();
  const [sqlOpen, setSqlOpen] = useState(false);
  const [waitlistFor, setWaitlistFor] = useState<Method | null>(null);
  const [waitlisted, setWaitlisted] = useState<Set<string>>(new Set());

  const methods: Method[] = [
    {
      slug: "csv",
      title: "CSV bulk upload",
      description: "Drop in a CSV of question / answer pairs with mapping preview.",
      emoji: "📄",
      status: "live",
      action: () => nav("/upload"),
    },
    {
      slug: "questionnaire",
      title: "Customer questionnaire",
      description: "xlsx / docx / pdf — auto-drafts answers with citations.",
      emoji: "📋",
      status: "live",
      action: () => nav("/questionnaires"),
    },
    {
      slug: "sql-direct",
      title: "Direct SQL connection",
      description: "Point at a Postgres / MySQL / MSSQL database and pull rows live.",
      emoji: "🗄️",
      status: "live",
      action: () => setSqlOpen(true),
    },
    {
      slug: "datasource-legacy",
      title: "Managed data sources",
      description: "Recurring CSV bundles + SQL syncs with beat schedule.",
      emoji: "🔁",
      status: "live",
      action: () => nav("/datasources"),
    },
    {
      slug: "rest-api",
      title: "REST API webhook",
      description: "POST question/answer JSON to a webhook — great for CI pipelines.",
      emoji: "🔗",
      status: "beta",
      action: () => setWaitlistFor(_get(methods, "rest-api")),
    },
    {
      slug: "notion",
      title: "Notion database",
      description: "Sync a Notion database of policies / QAs into your library.",
      emoji: "📘",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "notion")),
    },
    {
      slug: "confluence",
      title: "Confluence spaces",
      description: "Import approved-answer pages straight from Confluence.",
      emoji: "🏛️",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "confluence")),
    },
    {
      slug: "google-drive",
      title: "Google Drive folder",
      description: "Watch a Drive folder — new docs auto-parse into the library.",
      emoji: "📁",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "google-drive")),
    },
    {
      slug: "sharepoint",
      title: "SharePoint",
      description: "Enterprise SharePoint site sync for policies and past assessments.",
      emoji: "🗂️",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "sharepoint")),
    },
    {
      slug: "vanta",
      title: "Vanta / Drata",
      description: "Pull live control status + evidence from your GRC platform.",
      emoji: "🛡️",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "vanta")),
    },
    {
      slug: "salesforce",
      title: "Salesforce",
      description: "Trigger draft when an Opportunity hits security-review stage.",
      emoji: "☁️",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "salesforce")),
    },
    {
      slug: "email",
      title: "Email intake",
      description: "Auto-parse questionnaire attachments landing in a shared inbox.",
      emoji: "✉️",
      status: "waitlist",
      action: () => setWaitlistFor(_get(methods, "email")),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import knowledge</h1>
        <p className="text-slate-600 mt-1">
          Bring existing Q&A libraries and policies into Trust Copilot from any source.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map((m) => (
          <div
            key={m.slug}
            className={`bg-white rounded-lg border border-slate-200 p-5 flex flex-col ${
              m.status === "waitlist" ? "opacity-90" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
                {m.emoji}
              </div>
              <StatusPill status={m.status} />
            </div>
            <div className="mt-3 text-base font-semibold text-slate-900">{m.title}</div>
            <p className="mt-1 text-sm text-slate-600 flex-1">{m.description}</p>
            {waitlisted.has(m.slug) ? (
              <div className="mt-3 text-xs text-blue-700 font-medium">On the waitlist ✓</div>
            ) : (
              <button
                onClick={m.action}
                className={`mt-3 px-3 py-1.5 text-sm rounded ${
                  m.status === "live"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m.status === "live" ? "Configure →" : "Request access"}
              </button>
            )}
          </div>
        ))}
      </div>

      {sqlOpen && <SqlTestModal onClose={() => setSqlOpen(false)} onConfigure={() => nav("/datasources")} />}
      {waitlistFor && (
        <WaitlistModal
          method={waitlistFor}
          onClose={() => setWaitlistFor(null)}
          onJoin={(slug) => {
            setWaitlisted((prev) => new Set(prev).add(slug));
            setWaitlistFor(null);
          }}
        />
      )}
    </div>
  );
}


function _get(methods: Method[], slug: string): Method {
  return methods.find((m) => m.slug === slug)!;
}


function StatusPill({ status }: { status: "live" | "beta" | "waitlist" }) {
  const map: Record<string, string> = {
    live: "bg-green-100 text-green-800",
    beta: "bg-amber-100 text-amber-800",
    waitlist: "bg-slate-100 text-slate-600",
  };
  const label = status === "live" ? "Live" : status === "beta" ? "Beta" : "Coming soon";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status]}`}>{label}</span>;
}


// ── SQL live-connect test modal ─────────────────────────────────

function SqlTestModal({ onClose, onConfigure }: { onClose: () => void; onConfigure: () => void }) {
  const [dsn, setDsn] = useState("postgresql+psycopg://user:pass@host:5432/kb");
  const [query, setQuery] = useState(
    "SELECT id, question_text, answer_text, updated_at\nFROM kb\nWHERE deleted_at IS NULL\nLIMIT 100"
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.datasources.testSql>> | null>(null);

  const test = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await api.datasources.testSql({ dsn, query, sample: 5 });
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={test}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div>
          <div className="text-2xl">🗄️</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Direct SQL connection</h3>
          <p className="text-sm text-slate-600 mt-1">
            Test a live database connection. Nothing is persisted until you save
            it as a Data Source.
          </p>
        </div>

        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Connection string (DSN)</span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
            value={dsn}
            onChange={(e) => setDsn(e.target.value)}
            required
          />
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Dialects: postgresql, mysql, mssql, sqlite. Example:
            <code className="bg-slate-100 px-1 rounded ml-1">mysql+pymysql://user:pass@host:3306/db</code>
          </span>
        </label>

        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Query</span>
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs h-32"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Testing…" : "Test connection"}
          </button>
          <button
            type="button"
            onClick={onConfigure}
            className="px-3 py-2 rounded border border-slate-300 text-sm hover:bg-slate-50"
          >
            Save as data source →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-3 py-2 rounded text-sm text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {result && (
          <div className="pt-3 border-t border-slate-100">
            {result.ok ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    ✓ Connected
                  </span>
                  <span className="text-xs text-slate-500">
                    dialect: <b>{result.dialect}</b>
                    {typeof result.row_count_estimate === "number" && (
                      <> · rows estimated: <b>{result.row_count_estimate.toLocaleString()}</b></>
                    )}
                  </span>
                </div>
                {result.sample_rows && result.sample_rows.length > 0 && (
                  <div className="mt-2 rounded border border-slate-200 overflow-hidden">
                    <div className="text-xs px-3 py-1.5 bg-slate-50 border-b border-slate-200 font-medium text-slate-600">
                      Sample rows
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            {(result.columns || []).map((c) => (
                              <th key={c} className="px-3 py-1 text-left font-medium text-slate-600">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.sample_rows.map((row, i) => (
                            <tr key={i}>
                              {(result.columns || []).map((c) => (
                                <td key={c} className="px-3 py-1 text-slate-700 max-w-xs truncate">
                                  {row[c] ?? "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium inline-block">
                  ✗ Connection failed
                </div>
                <pre className="mt-2 text-xs bg-red-50 border border-red-200 rounded p-2 whitespace-pre-wrap text-red-800">
                  {result.error}
                </pre>
                <div className="text-xs text-slate-500 mt-2">
                  Common causes: wrong host / firewall, wrong credentials, missing driver, invalid dialect prefix.
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}


function WaitlistModal({
  method,
  onClose,
  onJoin,
}: {
  method: Method;
  onClose: () => void;
  onJoin: (slug: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-3xl">{method.emoji}</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{method.title}</h3>
        <p className="text-slate-600 mt-2 text-sm">
          {method.description}
        </p>
        <p className="text-xs text-slate-500 mt-3">
          {method.status === "beta"
            ? "Currently in private beta with a handful of design-partner customers. Join the waitlist and we'll onboard your team next."
            : "On the near-term roadmap. Join the waitlist and we'll email you the moment it lands."}
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onJoin(method.slug)}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Join waitlist
          </button>
        </div>
      </div>
    </div>
  );
}
