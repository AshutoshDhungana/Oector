import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, QAEntry } from "../api";
import ProductSelect from "../components/ProductSelect";

type EntryDraft = Pick<QAEntry, "question" | "answer" | "details" | "source" | "status">;

export default function EntriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const openedFromFreshness = searchParams.get("from") === "freshness";
  const [product, setProduct] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<QAEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [focused, setFocused] = useState<QAEntry | null>(null);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusErr, setFocusErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(reset = false) {
    setLoading(true);
    setErr(null);
    try {
      const page = await api.entries.list({
        product: product || undefined,
        q: q || undefined,
        cursor: reset ? undefined : cursor ?? undefined,
        limit: 25,
      });
      setRows((prev) => (reset ? page.items : [...prev, ...page.items]));
      setCursor(page.next_cursor);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); }, [product]);

  useEffect(() => {
    if (!highlightId) {
      setFocused(null);
      setFocusErr(null);
      setEditing(false);
      return;
    }
    let cancelled = false;
    setFocusLoading(true);
    setFocusErr(null);
    setEditing(false);
    api.entries.get(highlightId)
      .then((entry) => {
        if (cancelled) return;
        setFocused(entry);
        setDraft(toDraft(entry));
      })
      .catch(() => {
        if (!cancelled) setFocusErr("This entry is no longer available in the active library.");
      })
      .finally(() => { if (!cancelled) setFocusLoading(false); });
    return () => { cancelled = true; };
  }, [highlightId]);

  function focusEntry(entry: QAEntry) { setSearchParams({ highlight: entry.id }); }
  function closeFocus() { setSearchParams({}); }

  async function saveFocused() {
    if (!focused || !draft) return;
    setBusy(true);
    setFocusErr(null);
    try {
      const updated = await api.entries.update(focused.id, draft);
      setFocused(updated);
      setDraft(toDraft(updated));
      setRows((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry));
      setEditing(false);
      setNotice("Entry updated.");
    } catch (e) { setFocusErr(String(e)); } finally { setBusy(false); }
  }

  async function archiveFocused() {
    if (!focused || !confirm(`Archive this entry? It will no longer appear in the active library.\n\n${focused.question}`)) return;
    setBusy(true);
    try {
      await api.entries.delete(focused.id);
      setRows((prev) => prev.filter((entry) => entry.id !== focused.id));
      setNotice("Entry archived.");
      closeFocus();
    } catch (e) { setFocusErr(String(e)); } finally { setBusy(false); }
  }

  async function recheckFocused() {
    if (!focused) return;
    setBusy(true);
    try {
      await api.health.recheck(focused.id);
      setNotice("Freshness re-check queued. Refresh the Freshness page in a moment.");
    } catch (e) { setFocusErr(String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Entries</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(true)} placeholder="Substring search…" className="ml-auto w-64 rounded border border-slate-300 px-3 py-1.5 text-sm bg-white" />
        <ProductSelect value={product} onChange={setProduct} />
        <button className="rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={() => load(true)}>Search</button>
      </div>

      {notice && <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {(highlightId || focused || focusLoading || focusErr) && (
        <FocusedEntry
          entry={focused} draft={draft} loading={focusLoading} error={focusErr} editing={editing} busy={busy} fromFreshness={openedFromFreshness}
          onClose={closeFocus} onEdit={() => setEditing(true)} onCancelEdit={() => { setDraft(focused ? toDraft(focused) : null); setEditing(false); }}
          onDraftChange={setDraft} onSave={saveFocused} onArchive={archiveFocused} onRecheck={recheckFocused}
        />
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs"><tr><th className="text-left px-3 py-2">Question</th><th className="text-left px-3 py-2 w-32">Status</th><th className="text-left px-3 py-2 w-40">Updated</th><th className="text-right px-3 py-2 w-20" /></tr></thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id} className={`border-t border-slate-100 hover:bg-slate-50 ${focused?.id === entry.id ? "bg-blue-50" : ""}`}>
                <td className="px-3 py-2"><div className="line-clamp-1 font-medium">{entry.question}</div><div className="line-clamp-1 text-slate-500 text-xs mt-0.5">{entry.answer}</div></td>
                <td className="px-3 py-2"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{entry.status}</span></td>
                <td className="px-3 py-2 text-slate-500 text-xs">{new Date(entry.updated_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-right"><button className="text-xs text-blue-600 hover:underline" onClick={() => focusEntry(entry)}>View</button></td>
              </tr>
            ))}
            {rows.length === 0 && !loading && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={4}>No entries.</td></tr>}
          </tbody>
        </table>
      </div>

      {cursor && <button className="w-full rounded border border-slate-300 bg-white py-2 text-sm" onClick={() => load(false)} disabled={loading}>{loading ? "…" : "Load more"}</button>}
    </div>
  );
}

function FocusedEntry({ entry, draft, loading, error, editing, busy, fromFreshness, onClose, onEdit, onCancelEdit, onDraftChange, onSave, onArchive, onRecheck }: {
  entry: QAEntry | null; draft: EntryDraft | null; loading: boolean; error: string | null; editing: boolean; busy: boolean; fromFreshness: boolean;
  onClose: () => void; onEdit: () => void; onCancelEdit: () => void; onDraftChange: (draft: EntryDraft) => void; onSave: () => void; onArchive: () => void; onRecheck: () => void;
}) {
  if (loading) return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading selected entry…</div>;
  if (!entry) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || "Entry unavailable."}</div>;

  return (
    <section className="rounded-lg border-2 border-blue-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">{fromFreshness ? "Opened from Freshness" : "Selected entry"}</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Entry detail</h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Status: <b className="text-slate-700">{entry.status}</b></span>{entry.external_id && <span>External ID: <code>{entry.external_id}</code></span>}<span>Updated: {new Date(entry.updated_at).toLocaleString()}</span></div>
        </div>
        <button className="text-sm text-slate-500 hover:text-slate-800" onClick={onClose}>Close</button>
      </div>
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {editing && draft ? (
        <div className="grid gap-3">
          <Field label="Question"><textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm" rows={3} value={draft.question} onChange={(e) => onDraftChange({ ...draft, question: e.target.value })} /></Field>
          <Field label="Answer"><textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm" rows={7} value={draft.answer} onChange={(e) => onDraftChange({ ...draft, answer: e.target.value })} /></Field>
          <Field label="Details"><textarea className="w-full rounded border border-slate-300 px-3 py-2 text-sm" rows={3} value={draft.details || ""} onChange={(e) => onDraftChange({ ...draft, details: e.target.value || null })} /></Field>
          <Field label="Source"><input className="w-full rounded border border-slate-300 px-3 py-2 text-sm" value={draft.source || ""} onChange={(e) => onDraftChange({ ...draft, source: e.target.value || null })} /></Field>
          <div className="flex gap-2"><button disabled={busy} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" onClick={onSave}>Save changes</button><button disabled={busy} className="rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={onCancelEdit}>Cancel</button></div>
        </div>
      ) : (
        <div className="grid gap-3">
          <ReadOnlyField label="Question" value={entry.question} /><ReadOnlyField label="Answer" value={entry.answer} />
          {entry.details && <ReadOnlyField label="Details" value={entry.details} />}
          <div className="text-sm text-slate-600">Source: <span className="text-slate-900">{entry.source || "Not specified"}</span></div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3"><button disabled={busy} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50" onClick={onEdit}>Edit entry</button><button disabled={busy} className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50" onClick={onRecheck}>Re-check freshness</button><button disabled={busy} className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50" onClick={onArchive}>Archive entry</button></div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{value}</div></div>; }
function toDraft(entry: QAEntry): EntryDraft { return { question: entry.question, answer: entry.answer, details: entry.details, source: entry.source, status: entry.status }; }
