import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, OutdatedFlag } from "../api";
import ProductSelect from "../components/ProductSelect";

const STATUS_COLOR: Record<string, string> = {
  fresh: "bg-emerald-100 text-emerald-800",
  aging: "bg-yellow-100 text-yellow-800",
  outdated: "bg-orange-100 text-orange-800",
  stale: "bg-red-100 text-red-800",
  unknown: "bg-slate-100 text-slate-700",
};

export default function OutdatedPage() {
  const [product, setProduct] = useState("");
  const [rows, setRows] = useState<OutdatedFlag[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load(reset = false) {
    setLoading(true);
    setErr(null);
    try {
      const page = await api.health.outdated({
        product: product || undefined,
        status: status || undefined,
        cursor: reset ? undefined : cursor ?? undefined,
        limit: 50,
      });
      setRows((prev) => (reset ? page.items : [...prev, ...page.items]));
      setCursor(page.next_cursor);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    setExpanded(new Set());
  }, [status, product]);

  async function recheck(id: string) {
    await api.health.recheck(id);
    setNotice(`Re-check queued for ${id.slice(0, 8)}. Refresh in a minute.`);
    setTimeout(() => setNotice(null), 5000);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Outdated content</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Freshness scores from age priors, LLM verdicts, and compliance-change signals. Click a row to see the question and answer being flagged.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ProductSelect
          value={product}
          onChange={setProduct}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
        />
        <select
          className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="fresh">Fresh</option>
          <option value="aging">Aging</option>
          <option value="outdated">Outdated</option>
          <option value="stale">Stale</option>
          <option value="unknown">Unknown</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {notice && (
        <div className="rounded bg-emerald-50 border border-emerald-200 text-emerald-700 p-2 text-sm">
          {notice}
        </div>
      )}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2 w-24">Status</th>
              <th className="text-left px-3 py-2 w-16">Score</th>
              <th className="text-left px-3 py-2">Question &amp; reason</th>
              <th className="text-left px-3 py-2 w-40">Original updated</th>
              <th className="text-right px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = expanded.has(r.qa_entry_id);
              const q = r.entry?.question ?? "(entry unavailable)";
              const origUpdated = r.entry?.original_updated_at
                ? new Date(r.entry.original_updated_at).toLocaleDateString()
                : "unknown";
              return (
                <Fragment key={r.qa_entry_id}>
                  <tr
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggle(r.qa_entry_id)}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLOR[r.status] ?? ""
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-sm">{r.score.toFixed(0)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 shrink-0 mt-0.5">
                          {isOpen ? "▾" : "▸"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-slate-900 font-medium line-clamp-2">
                            {q}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {r.reason ?? "no reason recorded"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {origUpdated}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          recheck(r.qa_entry_id);
                        }}
                      >
                        Re-check
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={5} className="px-3 py-4">
                        {r.entry ? (
                          <div className="space-y-3 pl-8">
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Question
                              </div>
                              <div className="mt-1 text-slate-900">
                                {r.entry.question}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Current answer
                              </div>
                              <div className="mt-1 text-slate-800 whitespace-pre-wrap">
                                {r.entry.answer}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              {r.entry.external_id && (
                                <span>
                                  <span className="text-slate-400">External ID:</span>{" "}
                                  <code className="bg-slate-200 px-1 rounded">
                                    {r.entry.external_id}
                                  </code>
                                </span>
                              )}
                              {r.entry.source && (
                                <span>
                                  <span className="text-slate-400">Source:</span>{" "}
                                  {r.entry.source}
                                </span>
                              )}
                              <span>
                                <span className="text-slate-400">Entry ID:</span>{" "}
                                <code className="bg-slate-200 px-1 rounded">
                                  {r.entry.id.slice(0, 8)}…
                                </code>
                              </span>
                              <span>
                                <span className="text-slate-400">Flag reason:</span>{" "}
                                {r.reason ?? "—"}
                              </span>
                            </div>
                            <div>
                              <Link
                                to={`/entries?highlight=${r.entry.id}&from=freshness`}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Open in Entries →
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="pl-8 text-slate-500 text-sm italic">
                            Entry no longer available in the library (may have been
                            hard-deleted).
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Nothing flagged yet — run the beat scheduler and give it a minute.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {cursor && (
        <button
          className="w-full rounded border border-slate-300 bg-white py-2 text-sm hover:bg-slate-50"
          onClick={() => load(false)}
          disabled={loading}
        >
          {loading ? "…" : "Load more"}
        </button>
      )}
    </div>
  );
}
