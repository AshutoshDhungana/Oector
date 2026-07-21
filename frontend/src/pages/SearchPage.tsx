import { FormEvent, useState } from "react";
import { api, SimilarityHit } from "../api";
import ProductSelect from "../components/ProductSelect";

export default function SearchPage() {
  const [product, setProduct] = useState("");
  const [text, setText] = useState("");
  const [hits, setHits] = useState<SimilarityHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api.search.similar(text, product || undefined, 10);
      setHits(r.hits);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Similarity search</h1>

      <form onSubmit={onSearch} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <textarea
          className="w-full rounded border border-slate-300 px-3 py-2 h-24"
          placeholder="Paste any text (question, requirement, RFP snippet)…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <div className="flex items-center gap-2">
          <ProductSelect value={product} onChange={setProduct} />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="ml-auto rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="space-y-2">
        {hits.map((h) => (
          <div key={h.entry.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5">
                score {h.score.toFixed(3)}
              </span>
              <span>{new Date(h.entry.updated_at).toLocaleString()}</span>
            </div>
            <div className="mt-1 font-medium text-sm">{h.entry.question}</div>
            <div className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{h.entry.answer}</div>
          </div>
        ))}
        {hits.length === 0 && !busy && (
          <div className="text-sm text-slate-500 text-center py-6">No results yet.</div>
        )}
      </div>
    </div>
  );
}
