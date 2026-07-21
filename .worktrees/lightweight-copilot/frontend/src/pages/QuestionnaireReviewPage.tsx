import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, QuestionnaireDetail, QuestionnaireItem, QuestionnaireProgress } from "../api";

export default function QuestionnaireReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<QuestionnaireDetail | null>(null);
  const [progress, setProgress] = useState<QuestionnaireProgress | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "high" | "gaps">("all");

  const load = useCallback(async () => {
    if (!id) return;
    const d = await api.questionnaires.get(id);
    setDetail(d);
    return d;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: number | undefined;

    const pollProgress = async () => {
      try {
        const snapshot = await api.questionnaires.progress(id);
        if (cancelled) return;
        setProgress(snapshot);
        if (snapshot.status === "drafting" || snapshot.status === "parsing") {
          timer = window.setTimeout(
            pollProgress,
            document.hidden ? 15000 : 5000,
          );
        } else {
          // Fetch the full review payload once drafting is complete.
          await load();
        }
      } catch {
        if (!cancelled) timer = window.setTimeout(pollProgress, 10000);
      }
    };

    const start = async () => {
      const initial = await load();
      if (!cancelled && (initial?.questionnaire.status === "drafting" || initial?.questionnaire.status === "parsing")) {
        await pollProgress();
      }
    };
    void start().catch(() => undefined);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [id, load]);

  const items = detail?.items ?? [];
  const filtered = useMemo(() => {
    if (filter === "pending") return items.filter((i) => i.review_status === "pending");
    if (filter === "high") return items.filter((i) => i.confidence >= 0.75);
    if (filter === "gaps") return items.filter((i) => i.verdict === "gap");
    return items;
  }, [items, filter]);

  const current = filtered[selectedIdx] ?? null;

  // Reset selection when filter changes.
  useEffect(() => {
    setSelectedIdx(0);
    setEditing(false);
  }, [filter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "a" && current) {
        e.preventDefault();
        approve();
      } else if (e.key === "e" && current) {
        e.preventDefault();
        setEditText(current.final_answer ?? current.drafted_answer ?? "");
        setEditing(true);
      } else if (e.key === "x" && current) {
        e.preventDefault();
        reject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, filtered.length, editing]);

  const approve = useCallback(async () => {
    if (!current || !id) return;
    setBusy(true);
    try {
      await api.questionnaires.approveItem(id, current.id, {
        final_answer: current.final_answer ?? current.drafted_answer ?? undefined,
      });
      await load();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } finally {
      setBusy(false);
    }
  }, [current, id, load, filtered.length]);

  const reject = useCallback(async () => {
    if (!current || !id) return;
    setBusy(true);
    try {
      await api.questionnaires.rejectItem(id, current.id);
      await load();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } finally {
      setBusy(false);
    }
  }, [current, id, load, filtered.length]);

  const saveEdit = useCallback(async () => {
    if (!current || !id) return;
    setBusy(true);
    try {
      await api.questionnaires.approveItem(id, current.id, { final_answer: editText });
      await load();
      setEditing(false);
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } finally {
      setBusy(false);
    }
  }, [current, id, editText, load, filtered.length]);

  const bulkAcceptHigh = useCallback(async () => {
    if (!id) return;
    setBusy(true);
    try {
      const result = await api.questionnaires.bulkApproveHigh(id);
      if (result.approved > 0) await load();
    } finally {
      setBusy(false);
    }
  }, [id, load]);

  if (!detail) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  const q = detail.questionnaire;
  const stats = detail.stats;
  const isDrafting = q.status === "drafting" || q.status === "parsing";
  const draftedCount = progress?.drafted_items ?? items.filter((i) => i.drafted_answer).length;
  const totalCount = progress?.total_items ?? items.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              {q.customer ? `${q.customer} · ` : ""}{q.file_kind.toUpperCase()}
            </div>
            <h1 className="text-lg font-semibold text-slate-900 truncate">{q.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={bulkAcceptHigh}
              disabled={busy || stats.high_confidence === 0}
              className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              ⚡ Bulk-accept high-confidence ({items.filter(i => i.review_status === "pending" && i.confidence >= 0.75).length})
            </button>
            <a
              href={api.questionnaires.exportUrl(q.id)}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Export filled xlsx
            </a>
          </div>
        </div>

        {/* Progress banner while drafting */}
        {isDrafting && (
          <div className="mt-3 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Drafting answers… {draftedCount} / {totalCount} done
          </div>
        )}

        {/* Stat pills */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Pill color="green" label={`${stats.approved + stats.edited} approved`} />
          <Pill color="amber" label={`${stats.pending} pending`} />
          <Pill color="red" label={`${stats.rejected} rejected`} />
          <Pill color="blue" label={`${stats.high_confidence} high-confidence`} />
          <Pill color="slate" label={`${stats.gaps} gaps`} />
          <Pill color="slate" label={`avg confidence ${(stats.avg_confidence * 100).toFixed(0)}%`} />
        </div>

        {/* Filter tabs */}
        <div className="mt-3 flex items-center gap-1 text-sm">
          {(["all", "pending", "high", "gaps"] as const).map((f) => (
            <button
              key={f}
              className={`px-3 py-1 rounded ${
                filter === f
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All (${items.length})`
                : f === "pending" ? `Pending (${stats.pending})`
                : f === "high" ? `High conf. (${stats.high_confidence})`
                : `Gaps (${stats.gaps})`}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-400 hidden md:block">
            Shortcuts:  <kbd className="px-1 border rounded">j</kbd>/<kbd className="px-1 border rounded">k</kbd> nav ·
            <kbd className="px-1 border rounded ml-1">a</kbd> accept ·
            <kbd className="px-1 border rounded ml-1">e</kbd> edit ·
            <kbd className="px-1 border rounded ml-1">x</kbd> reject
          </div>
        </div>
      </div>

      {/* Body: 3-column layout */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-0">
        {/* Item list */}
        <div className="col-span-3 border-r border-slate-200 overflow-y-auto bg-slate-50">
          {filtered.map((it, idx) => (
            <ItemRow
              key={it.id}
              item={it}
              active={idx === selectedIdx}
              onClick={() => { setSelectedIdx(idx); setEditing(false); }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-slate-400 text-sm">No items match this filter.</div>
          )}
        </div>

        {/* Middle: question + drafted answer */}
        <div className="col-span-6 overflow-y-auto p-6 space-y-5">
          {!current ? (
            <div className="text-slate-400">Select an item.</div>
          ) : (
            <>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  {current.section ?? "Question"} {current.framework_ref ? `· ${current.framework_ref}` : ""}
                </div>
                <div className="text-lg text-slate-900 mt-1">{current.question}</div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Draft answer
                  </div>
                  <ConfidenceBadge confidence={current.confidence} verdict={current.verdict} />
                </div>

                {editing ? (
                  <>
                    <textarea
                      className="w-full min-h-[180px] rounded border border-slate-300 p-3 text-sm"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={busy}
                        className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Save & approve
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded bg-slate-50 border border-slate-200 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                    {current.drafted_answer || current.final_answer || (
                      <span className="text-slate-400 italic">
                        No draft — verdict: <b>{current.verdict}</b>. Needs analyst answer.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={approve}
                  disabled={busy || !current.drafted_answer}
                  className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Approve <span className="opacity-60 ml-1">a</span>
                </button>
                <button
                  onClick={() => {
                    setEditText(current.final_answer ?? current.drafted_answer ?? "");
                    setEditing(true);
                  }}
                  className="px-4 py-2 rounded border border-slate-300 text-sm hover:bg-slate-50"
                >
                  ✎ Edit <span className="opacity-60 ml-1">e</span>
                </button>
                <button
                  onClick={reject}
                  disabled={busy}
                  className="px-4 py-2 rounded border border-red-200 text-red-700 text-sm hover:bg-red-50"
                >
                  ✗ Reject <span className="opacity-60 ml-1">x</span>
                </button>
                <span className="ml-3 text-xs text-slate-500">
                  Status: <b>{current.review_status}</b>
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: citations & evidence */}
        <div className="col-span-3 border-l border-slate-200 overflow-y-auto p-4">
          <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
            Cited entries
          </div>
          {current && current.citation_entry_ids.length > 0 ? (
            <ul className="space-y-2">
              {current.citation_entry_ids.map((cid) => (
                <li key={cid}>
                  <a
                    href={`/entries?highlight=${cid}`}
                    className="block text-xs font-mono bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-1 hover:bg-blue-100"
                  >
                    entry {cid.slice(0, 8)}…
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-400 text-xs">No citations — the draft did not lean on the library.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── little pieces ──────────────────────────────────────────────────

function ItemRow({
  item,
  active,
  onClick,
}: {
  item: QuestionnaireItem;
  active: boolean;
  onClick: () => void;
}) {
  const statusColors: Record<string, string> = {
    approved: "text-green-700",
    edited: "text-green-700",
    rejected: "text-red-600",
    pending: "text-slate-500",
  };
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 border-b border-slate-100 cursor-pointer text-sm ${
        active ? "bg-white border-l-4 border-l-blue-500" : "hover:bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 w-8 font-mono">#{item.row_index}</span>
        <ConfidenceDot confidence={item.confidence} verdict={item.verdict} />
        <span className={`text-xs ${statusColors[item.review_status]}`}>
          {item.review_status !== "pending" && (item.review_status === "rejected" ? "✗" : "✓")}
        </span>
      </div>
      <div className="mt-1 text-slate-700 line-clamp-2 leading-snug">
        {item.question}
      </div>
    </div>
  );
}

function ConfidenceDot({ confidence, verdict }: { confidence: number; verdict: string }) {
  if (verdict === "gap") return <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />;
  const color = confidence >= 0.75 ? "bg-green-500" : confidence >= 0.55 ? "bg-amber-500" : "bg-red-400";
  return <span className={`w-2 h-2 rounded-full ${color} inline-block`} />;
}

function ConfidenceBadge({ confidence, verdict }: { confidence: number; verdict: string }) {
  if (verdict === "gap") {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">Gap · needs analyst</span>;
  }
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.75 ? "bg-green-100 text-green-800" : confidence >= 0.55 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{pct}% confidence</span>;
}

function Pill({ color, label }: { color: string; label: string }) {
  const map: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    slate: "bg-slate-100 text-slate-700",
  };
  return <span className={`px-2 py-0.5 rounded-full font-medium ${map[color]}`}>{label}</span>;
}
