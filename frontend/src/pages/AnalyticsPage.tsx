import { useEffect, useState } from "react";
import { api, AnalyticsOverview } from "../api";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [topQ, setTopQ] = useState<{ question: string; count: number }[]>([]);

  useEffect(() => {
    api.analytics.overview().then(setData).catch(() => setData(null));
    api.analytics.topQuestions(10).then(setTopQ).catch(() => setTopQ([]));
  }, []);

  if (!data) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">
          Live metrics across your knowledge library and drafted questionnaires.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <BigStat
          label="Hours saved"
          value={data.hours_saved.toFixed(1)}
          sub="vs. 6 min / question baseline"
          accent="green"
        />
        <BigStat
          label="Auto-answer rate"
          value={`${(data.auto_answer_rate * 100).toFixed(0)}%`}
          sub={`${data.items_approved} / ${data.items_total} approved`}
          accent="blue"
        />
        <BigStat
          label="Avg confidence"
          value={`${(data.avg_confidence * 100).toFixed(0)}%`}
          sub="across all drafts"
          accent="indigo"
        />
        <BigStat
          label="Open conflicts"
          value={String(data.conflicts_open)}
          sub="in library"
          accent={data.conflicts_open > 0 ? "amber" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MiniStat label="Library entries" value={data.library_active} sub={`${data.library_public} public`} />
        <MiniStat label="Questionnaires processed" value={data.questionnaires_total} sub={`${data.questionnaires_completed} completed`} />
        <MiniStat label="Entries with framework map" value={data.frameworks_mapped} sub={`of ${data.library_active}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm font-medium text-slate-700 mb-3">Coverage by framework</div>
          {Object.keys(data.by_framework).length === 0 ? (
            <div className="text-sm text-slate-400">No mappings yet. Run the mapping batch task.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.by_framework)
                .sort((a, b) => b[1] - a[1])
                .map(([fw, n]) => {
                  const max = Math.max(...Object.values(data.by_framework));
                  const pct = Math.round((n / max) * 100);
                  return (
                    <div key={fw}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">{fw}</span>
                        <span>{n} entries</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded overflow-hidden">
                        <div className="h-2 bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm font-medium text-slate-700 mb-3">Freshness distribution</div>
          {Object.keys(data.by_status).length === 0 ? (
            <div className="text-sm text-slate-400">No freshness data yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(data.by_status).map(([status, n]) => (
                <div key={status} className="flex items-center gap-2">
                  <FreshnessDot status={status} />
                  <span className="text-slate-700 capitalize">{status}</span>
                  <span className="ml-auto font-medium text-slate-800">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 md:col-span-2">
          <div className="text-sm font-medium text-slate-700 mb-3">Top asked questions</div>
          {topQ.length === 0 ? (
            <div className="text-sm text-slate-400">Not enough questionnaire history yet.</div>
          ) : (
            <ol className="space-y-1 text-sm">
              {topQ.map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-slate-400 w-6 font-mono">{i + 1}.</span>
                  <span className="flex-1 text-slate-700 truncate">{t.question}</span>
                  <span className="ml-auto text-slate-500 text-xs">×{t.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 md:col-span-2">
          <div className="text-sm font-medium text-slate-700 mb-3">Top products by library size</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide text-left">
                <th className="pb-2">Product</th>
                <th className="pb-2">Active entries</th>
                <th className="pb-2">Total usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.top_products.map((p) => (
                <tr key={p.slug}>
                  <td className="py-2 text-slate-800 font-medium">{p.name}</td>
                  <td className="py-2 text-slate-700">{p.active_entries}</td>
                  <td className="py-2 text-slate-700">{p.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  const map: Record<string, string> = {
    green: "border-l-green-500",
    blue: "border-l-blue-500",
    indigo: "border-l-indigo-500",
    amber: "border-l-amber-500",
    slate: "border-l-slate-300",
  };
  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${map[accent]} p-5`}>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-semibold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl text-slate-900 font-medium">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function FreshnessDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    fresh: "bg-green-500",
    aging: "bg-yellow-500",
    outdated: "bg-orange-500",
    stale: "bg-red-500",
    unknown: "bg-slate-400",
  };
  return <span className={`w-2 h-2 rounded-full ${map[status] ?? map.unknown} inline-block`} />;
}
