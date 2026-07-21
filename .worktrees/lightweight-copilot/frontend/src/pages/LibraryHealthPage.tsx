import { useCallback, useEffect, useState } from "react";
import { api, Conflict, ConflictDetail } from "../api";

export default function LibraryHealthPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selected, setSelected] = useState<ConflictDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await api.conflicts.list("open");
    setConflicts(list);
    if (list.length && !selected) {
      setSelected(await api.conflicts.get(list[0].id));
    } else if (!list.length) {
      setSelected(null);
    }
  }, [selected]);

  useEffect(() => { load(); }, []);

  const scan = useCallback(async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const r = await api.conflicts.scan(undefined, 200);
      if (r.queued) {
        setScanMsg("Scan queued — running against near-duplicate pairs. Results will appear as they land.");
        // Poll for ~90s so slower LLM scans still show up
        for (let i = 0; i < 18; i++) {
          await new Promise((res) => setTimeout(res, 5000));
          await load();
        }
      } else {
        // Inline fallback or a reason message from the server
        setScanMsg(
          (r as any).reason
            || (r.conflicts_found !== undefined
              ? `Checked ${r.pairs_checked ?? 0} pairs, found ${r.conflicts_found} conflicts.`
              : "Scan complete.")
        );
        await load();
      }
    } finally {
      setScanning(false);
    }
  }, [load]);

  const dismiss = useCallback(async (id: string) => {
    setBusy(true);
    try {
      await api.conflicts.dismiss(id);
      setSelected(null);
      await load();
    } finally { setBusy(false); }
  }, [load]);

  const resolve = useCallback(async (id: string) => {
    setBusy(true);
    try {
      await api.conflicts.resolve(id);
      setSelected(null);
      await load();
    } finally { setBusy(false); }
  }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Library Health</h1>
          <p className="text-slate-600 mt-1">
            LLM-detected contradictions across your approved knowledge library.
          </p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="px-4 py-2 rounded bg-slate-800 text-white text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "🔍 Scan for contradictions"}
        </button>
      </div>

      {scanMsg && (
        <div className="mb-4 rounded bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 text-sm">
          {scanMsg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* List */}
        <div className="col-span-4 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
          {conflicts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No open contradictions. Try a scan.
            </div>
          )}
          {conflicts.map((c) => (
            <button
              key={c.id}
              className={`block w-full text-left p-3 hover:bg-slate-50 ${
                selected?.conflict.id === c.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
              onClick={async () => setSelected(await api.conflicts.get(c.id))}
            >
              <div className="flex items-center gap-2">
                <SeverityBadge severity={c.severity} />
                <span className="text-xs text-slate-400">
                  {new Date(c.detected_at).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-700 line-clamp-3">
                {c.explanation}
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="col-span-8">
          {selected ? (
            <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={selected.conflict.severity} />
                    <span className="text-xs text-slate-500">
                      Detected {new Date(selected.conflict.detected_at).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-medium text-slate-900 mt-2">Potential contradiction</h2>
                  <p className="text-slate-700 mt-1">{selected.conflict.explanation}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => resolve(selected.conflict.id)}
                    disabled={busy}
                    className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark resolved
                  </button>
                  <button
                    onClick={() => dismiss(selected.conflict.id)}
                    disabled={busy}
                    className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <EntryCard label="Entry A" entry={selected.entry_a} />
                <EntryCard label="Entry B" entry={selected.entry_b} />
              </div>
            </div>
          ) : (
            <div className="text-slate-400 p-8">Select a conflict to review.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[severity] ?? map.medium}`}>
      {severity}
    </span>
  );
}

function EntryCard({ label, entry }: { label: string; entry: any }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{entry.question}</div>
      <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{entry.answer}</div>
      <div className="mt-2 text-xs text-slate-400 font-mono">
        id: {entry.id.slice(0, 8)}… · updated {new Date(entry.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}
