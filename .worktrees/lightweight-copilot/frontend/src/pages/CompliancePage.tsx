import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ComplianceChange, ComplianceSource } from "../api";

type Status = Awaited<ReturnType<typeof api.compliance.status>>;

export default function CompliancePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sources, setSources] = useState<ComplianceSource[]>([]);
  const [changes, setChanges] = useState<ComplianceChange[]>([]);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const [s, ss, ch] = await Promise.all([
      api.compliance.status().catch(() => null),
      api.compliance.listSources().catch(() => []),
      api.compliance.changes({ limit: 50 }).then((p) => p.items).catch(() => []),
    ]);
    setStatus(s);
    setSources(ss);
    setChanges(ch);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const crawlAll = useCallback(async () => {
    setBusy(true);
    try {
      await api.compliance.crawlAll();
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        await load();
      }
    } finally { setBusy(false); }
  }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compliance Auto-Crawler</h1>
          <p className="text-slate-600 mt-1">
            Watches public compliance sources for changes and links updates to affected
            library entries automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={crawlAll}
            disabled={busy || !status || status.enabled_sources === 0}
            className="px-4 py-2 rounded bg-slate-800 text-white text-sm hover:bg-slate-900 disabled:opacity-50"
          >
            {busy ? "Crawling…" : "🌐 Crawl all now"}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="px-3 py-2 rounded border border-slate-300 text-sm hover:bg-slate-50"
          >
            + Add source
          </button>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Sources" value={status.total_sources} sub={`${status.enabled_sources} enabled`} accent="blue" />
          <StatCard label="Changes (24h)" value={status.changes_24h} sub={`${status.total_changes} total`} accent="amber" />
          <StatCard label="Last crawl" value={status.last_poll_at ? _ago(status.last_poll_at) : "never"} accent="slate" />
          <StatCard label="Schedule" value="Every 15 min" sub="auto" accent="green" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm font-medium text-slate-800 mb-3 flex items-center justify-between">
            <span>Sources being watched</span>
            <span className="text-xs text-slate-500 font-normal">{sources.length} total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {sources.length === 0 && (
              <div className="text-sm text-slate-400 py-4">
                No sources yet. Seed with{" "}
                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">python -m scripts.seed_compliance_sources</code>{" "}
                or add one manually.
              </div>
            )}
            {sources.map((s) => (
              <SourceRow key={s.id} src={s} onChange={load} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm font-medium text-slate-800 mb-3">Detected changes</div>
          <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            {changes.length === 0 && (
              <div className="text-sm text-slate-400 py-4">
                No changes detected yet — nothing new since the last crawl, or sources haven't polled.
              </div>
            )}
            {changes.map((c) => (
              <ChangeRow key={c.id} change={c} />
            ))}
          </div>
        </div>
      </div>

      {addOpen && <AddSourceModal onClose={() => setAddOpen(false)} onAdded={load} />}
    </div>
  );
}


function SourceRow({ src, onChange }: { src: ComplianceSource; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  const crawl = async () => {
    setBusy(true);
    try { await api.compliance.crawlNow(src.id); } finally { setBusy(false); onChange(); }
  };
  const toggle = async () => {
    setBusy(true);
    try { await api.compliance.patchSource(src.id, { enabled: !src.enabled }); } finally { setBusy(false); onChange(); }
  };
  const del = async () => {
    if (!confirm(`Delete "${src.name}"?`)) return;
    setBusy(true);
    try { await api.compliance.deleteSource(src.id); } finally { setBusy(false); onChange(); }
  };

  return (
    <div className="py-3 flex items-start gap-2">
      <span className={`inline-block w-2 h-2 mt-2 rounded-full ${src.enabled ? "bg-green-500" : "bg-slate-300"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{src.name}</div>
        <div className="text-xs text-slate-500 truncate">
          <span className="uppercase font-mono">{src.kind}</span> · {src.url}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {src.last_polled_at ? `Last: ${_ago(src.last_polled_at)}` : "never polled"} · every {src.poll_interval_minutes}m
        </div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={crawl} disabled={busy}
          className="px-2 py-1 text-[11px] rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
          Crawl now
        </button>
        <button onClick={toggle} disabled={busy}
          className="px-2 py-1 text-[11px] rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50">
          {src.enabled ? "Disable" : "Enable"}
        </button>
        <button onClick={del} disabled={busy}
          className="px-2 py-1 text-[11px] rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
          Delete
        </button>
      </div>
    </div>
  );
}


function ChangeRow({ change }: { change: ComplianceChange }) {
  const [open, setOpen] = useState(false);
  const impactColor =
    change.impact_score >= 0.7 ? "bg-red-100 text-red-800" :
    change.impact_score >= 0.4 ? "bg-amber-100 text-amber-800" :
    "bg-slate-100 text-slate-700";
  return (
    <div className="py-3">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${impactColor}`}>
            impact {change.impact_score.toFixed(2)}
          </span>
          <span className="text-xs text-slate-500">{_ago(change.detected_at)}</span>
          {change.affected_qa_ids.length > 0 && (
            <span className="text-xs text-blue-700">
              → {change.affected_qa_ids.length} affected {change.affected_qa_ids.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-slate-800 line-clamp-2">{change.summary}</div>
      </button>
      {open && change.affected_qa_ids.length > 0 && (
        <div className="mt-2 ml-3 text-xs text-slate-600">
          Affected entries:{" "}
          {change.affected_qa_ids.slice(0, 6).map((id) => (
            <a key={id} href={`/entries?highlight=${id}`} className="font-mono bg-slate-100 rounded px-1 mr-1">
              {id.slice(0, 8)}…
            </a>
          ))}
          {change.affected_qa_ids.length > 6 && (
            <span>+{change.affected_qa_ids.length - 6} more</span>
          )}
        </div>
      )}
    </div>
  );
}


function AddSourceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"rss" | "http" | "sitemap">("rss");
  const [interval_, setInterval_] = useState(60);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.compliance.addSource({ name, url, kind, poll_interval_minutes: interval_ });
      onAdded();
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-3"
      >
        <div className="text-lg font-semibold text-slate-900">Add compliance source</div>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">URL (RSS/atom feed)</span>
          <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Kind</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5">
              <option value="rss">RSS</option>
              <option value="http">HTTP page</option>
              <option value="sitemap">Sitemap</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Poll every (min)</span>
            <input type="number" min={5} value={interval_}
              onChange={(e) => setInterval_(parseInt(e.target.value) || 60)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <div className="flex gap-2 justify-end pt-3">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded border border-slate-300">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? "Adding…" : "Add source"}
          </button>
        </div>
      </form>
    </div>
  );
}


function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  const map: Record<string, string> = {
    green: "border-l-green-500",
    blue: "border-l-blue-500",
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


function _ago(iso: string): string {
  const d = new Date(iso);
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
