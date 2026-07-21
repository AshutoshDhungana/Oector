import { useEffect, useState } from "react";
import { api, MergeQueueItem, MergeSourceEntry } from "../api";
import ProductSelect from "../components/ProductSelect";

export default function MergeReviewPage() {
  const [product, setProduct] = useState("");
  const [items, setItems] = useState<MergeQueueItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<MergeQueueItem | null>(null);
  const [draft, setDraft] = useState({ question: "", answer: "", details: "" });
  const [err, setErr] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);

  async function load(reset = false) {
    setLoading(true);
    setErr(null);
    try {
      const page = await api.merge.queue({
        product: product || undefined,
        status: "pending",
        cursor: reset ? undefined : cursor ?? undefined,
        limit: 25,
      });
      setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
      setCursor(page.next_cursor);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    setSelected(null);
  }, [product]);

  function open(mq: MergeQueueItem) {
    setSelected(mq);
    setDraft({
      question: mq.canonical_draft?.question ?? "",
      answer: mq.canonical_draft?.answer ?? "",
      details: mq.canonical_draft?.details ?? "",
    });
  }

  async function approve() {
    if (!selected) return;
    await api.merge.approve(selected.id, draft);
    setSelected(null);
    load(true);
  }

  async function reject() {
    if (!selected) return;
    await api.merge.reject(selected.id);
    setSelected(null);
    load(true);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Merge queue</h1>
          <p className="text-slate-600 mt-1 text-sm">
            LLM-suggested merges of near-duplicate library entries. Approve to write a canonical answer + soft-archive the duplicates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProductSelect value={product} onChange={setProduct} className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white" />
          <button
            onClick={async () => {
              setSuggesting(true);
              setSuggestMsg(null);
              try {
                const r = await api.mergeExtra.suggestBatch(200);
                if (r.queued) {
                  setSuggestMsg("Merge suggestions queued — check back in ~1 minute.");
                  for (let i = 0; i < 6; i++) {
                    await new Promise((res) => setTimeout(res, 5000));
                    await load(true);
                  }
                } else {
                  setSuggestMsg(r.error || "Failed to enqueue — is the worker running?");
                }
              } finally { setSuggesting(false); }
            }}
            disabled={suggesting}
            className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm hover:bg-slate-900 disabled:opacity-50"
          >
            {suggesting ? "Suggesting…" : "🔀 Suggest merges"}
          </button>
        </div>
      </div>

      {suggestMsg && (
        <div className="rounded bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 text-sm">
          {suggestMsg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5 space-y-2 max-h-[80vh] overflow-y-auto pr-1">
          {err && <div className="text-sm text-red-600">{err}</div>}
          {items.map((m) => (
            <button
              key={m.id}
              className={`w-full text-left rounded-lg border p-3 hover:bg-slate-50 ${
                selected?.id === m.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
              }`}
              onClick={() => open(m)}
            >
              <div className="text-xs text-slate-500">
                {m.suggested_by} · {new Date(m.created_at).toLocaleString()}
              </div>
              <div className="line-clamp-2 mt-1 text-sm font-medium">
                {m.canonical_draft?.question ?? "(no draft)"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                1 primary + {m.secondary_qa_ids.length} secondaries
              </div>
            </button>
          ))}
          {items.length === 0 && !loading && (
            <div className="text-sm text-slate-500 text-center py-8 rounded-lg border border-dashed border-slate-300 bg-white">
              <div className="text-2xl mb-2">🔀</div>
              <div className="font-medium text-slate-700">No pending merge candidates</div>
              <div className="text-xs mt-1">
                Click <b>Suggest merges</b> above to have the LLM scan clusters
                of similar entries and propose canonical merges.
              </div>
            </div>
          )}
          {cursor && (
            <button
              className="w-full rounded border border-slate-300 bg-white py-2 text-sm"
              onClick={() => load(false)}
              disabled={loading}
            >
              {loading ? "…" : "Load more"}
            </button>
          )}
        </div>

        <div className="col-span-7">
          {!selected ? (
            <div className="text-slate-500 rounded-lg border border-dashed border-slate-300 p-8 text-center">
              Pick a candidate on the left.
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 className="font-semibold">Entries being merged</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Review the original library entries first. Approving keeps the primary entry as the canonical record and archives the secondary entries.
                </p>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {selected.primary_entry ? (
                  <EntryCard entry={selected.primary_entry} role="Primary — retained as canonical" />
                ) : (
                  <MissingEntryCard role="Primary" id={selected.primary_qa_id} />
                )}
                {selected.secondary_entries.map((entry, index) => (
                  <EntryCard key={entry.id} entry={entry} role={`Secondary ${index + 1} — archived after approval`} />
                ))}
                {selected.secondary_entries.length < selected.secondary_qa_ids.length &&
                  selected.secondary_qa_ids
                    .filter((id) => !selected.secondary_entries.some((entry) => entry.id === id))
                    .map((id, index) => <MissingEntryCard key={id} role={`Secondary ${selected.secondary_entries.length + index + 1}`} id={id} />)}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold">Canonical draft (editable)</h3>
                <p className="mt-1 text-sm text-slate-600">
                  This is the record that will replace the primary entry when you approve the merge.
                </p>
              </div>

              <label className="block text-sm">
                <span className="text-slate-600">Question</span>
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={draft.question}
                  onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                />
              </label>

              <label className="block text-sm">
                <span className="text-slate-600">Answer</span>
                <textarea
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 h-48"
                  value={draft.answer}
                  onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                />
              </label>

              <label className="block text-sm">
                <span className="text-slate-600">Details</span>
                <textarea
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 h-24"
                  value={draft.details}
                  onChange={(e) => setDraft({ ...draft, details: e.target.value })}
                />
              </label>

              {selected.llm_rationale && (
                <div className="rounded bg-slate-50 p-3 text-sm border border-slate-200">
                  <div className="font-medium text-slate-700">LLM rationale</div>
                  <div className="text-slate-600 mt-1">{selected.llm_rationale}</div>
                </div>
              )}
              {selected.canonical_draft?.notes && selected.canonical_draft.notes.length > 0 && (
                <div className="rounded bg-amber-50 p-3 text-sm border border-amber-200">
                  <div className="font-medium text-amber-800">Nuances preserved</div>
                  <ul className="list-disc ml-5 mt-1 text-amber-900">
                    {selected.canonical_draft.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button className="rounded bg-blue-600 px-4 py-2 text-white text-sm font-medium" onClick={approve}>
                  Approve merge
                </button>
                <button
                  className="rounded border border-red-500 px-4 py-2 text-red-600 text-sm"
                  onClick={reject}
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry, role }: { entry: MergeSourceEntry; role: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-slate-700">{role}</div>
        <div className="text-right text-[11px] text-slate-500">
          {entry.external_id && <div className="font-mono">{entry.external_id}</div>}
          <div>updated {new Date(entry.updated_at).toLocaleDateString()}</div>
        </div>
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Question</div>
        <p className="mt-1 text-sm font-medium text-slate-900 whitespace-pre-wrap">{entry.question}</p>
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Answer</div>
        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{entry.answer}</p>
      </div>
      {entry.details && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Details</div>
          <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">{entry.details}</p>
        </div>
      )}
      <div className="text-xs text-slate-500">Source: {entry.source || "Not specified"}</div>
    </article>
  );
}

function MissingEntryCard({ role, id }: { role: string; id: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div className="font-medium">{role} entry is no longer available</div>
      <div className="mt-1 font-mono text-xs break-all">{id}</div>
    </div>
  );
}
