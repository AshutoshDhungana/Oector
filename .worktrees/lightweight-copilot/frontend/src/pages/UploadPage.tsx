import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, Product } from "../api";
import { useJobStream } from "../hooks/useJobStream";
import { notifyProductsChanged } from "../components/ProductSelect";

type Mode = "existing" | "new";
const PREVIEW_BYTES = 128 * 1024;

export default function UploadPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mode, setMode] = useState<Mode>("existing");
  const [existingSlug, setExistingSlug] = useState("");
  const [newName, setNewName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][]; total: number | null } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [lastProduct, setLastProduct] = useState<{ slug: string; name: string } | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { snap, done } = useJobStream(jobId);
  const selectedProduct = products.find((product) => product.slug === existingSlug) ?? null;

  const reloadProducts = useCallback(async () => {
    const ps = await api.products.list();
    setProducts(ps);
    if (!existingSlug && ps[0]) setExistingSlug(ps[0].slug);
    if (ps.length === 0) setMode("new");
  }, [existingSlug]);

  useEffect(() => {
    reloadProducts().catch((e) => setErr(String(e)));
  }, [reloadProducts]);

  // Client-side CSV peek so the user sees what they're uploading.
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    // Never read a whole multi-megabyte upload on the browser's main thread
    // merely to display five rows. The server still receives the full file.
    file.slice(0, PREVIEW_BYTES).text().then((raw) => {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;
      const parseRow = (l: string) => _parseCsvLine(l);
      const headers = parseRow(lines[0]);
      const rows = lines.slice(1, 6).map(parseRow);
      setPreview({ headers, rows, total: file.size <= PREVIEW_BYTES ? lines.length - 1 : null });
    }).catch(() => setPreview(null));
  }, [file]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setBusy(true);
    setErr(null);
    setJobId(null);
    setLastProduct(null);
    try {
      const r = await api.uploads.csv(
        mode === "existing"
          ? { productSlug: existingSlug, file }
          : { productName: newName.trim(), file }
      );
      setJobId(r.job_id);
      setLastProduct(r.product);
      if (mode === "new") {
        await reloadProducts();
        notifyProductsChanged();
        setMode("existing");
        setExistingSlug(r.product.slug);
        setNewName("");
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteLoadedProduct() {
    if (!selectedProduct) return;
    const confirmation = window.prompt(
      `This permanently deletes "${selectedProduct.name}" and all of its library entries, embeddings, clusters, and managed data sources. Existing questionnaires will remain but become unscoped.\n\nType the product slug "${selectedProduct.slug}" to confirm.`
    );
    if (confirmation !== selectedProduct.slug) return;

    setBusy(true);
    setErr(null);
    try {
      await api.products.delete(selectedProduct.slug);
      const remaining = await api.products.list();
      setProducts(remaining);
      setExistingSlug(remaining[0]?.slug ?? "");
      setMode(remaining.length ? "existing" : "new");
      setJobId(null);
      setLastProduct(null);
      notifyProductsChanged();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  const columnMatch = preview ? _matchColumns(preview.headers) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bulk import — CSV</h1>
        <p className="text-slate-600 mt-1">
          Load an existing library of Q&A pairs from a CSV. Rows are ingested,
          then embedded and clustered in the background.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        {/* Product selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
                disabled={products.length === 0}
              />
              <span>Existing product</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
              <span>New product</span>
            </label>
          </div>

          {mode === "existing" ? (
            <div className="block text-sm md:col-span-3 space-y-2">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Product</span>
                <select
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 bg-white"
                  value={existingSlug}
                  onChange={(e) => setExistingSlug(e.target.value)}
                  required
                >
                  {products.length === 0 && <option value="">(no products yet)</option>}
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </label>
              {selectedProduct && (
                <div className="flex items-center justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-xs text-red-800">
                    Permanently remove this loaded product and all of its library data.
                  </span>
                  <button
                    type="button"
                    onClick={deleteLoadedProduct}
                    disabled={busy}
                    className="shrink-0 rounded border border-red-400 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Delete product
                  </button>
                </div>
              )}
            </div>
          ) : (
            <label className="block text-sm md:col-span-3">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">New product name</span>
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                placeholder="e.g. Atlas — Cloud Data Platform"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Slug is auto-generated. If a product with the same slug exists it will be reused.
              </span>
            </label>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400"
          }`}
          onClick={() => document.getElementById("csv-file-input")?.click()}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <div className="text-slate-800 font-medium">{file.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
                {preview?.total !== null && preview && ` · ${preview.total} rows detected`}
                {preview?.total === null && " · previewed from first 128 KB"}
              </div>
            </div>
          ) : (
            <div className="text-slate-500">
              <div className="text-lg mb-1">Drop a CSV file here</div>
              <div className="text-xs">
                Expected columns: <code>question</code>, <code>answer</code>, and optionally{" "}
                <code>details</code>, <code>external_id</code>, <code>updated_at</code>, <code>source</code>
              </div>
            </div>
          )}
        </div>

        {/* Column-match preview */}
        {columnMatch && (
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
              Column mapping ({preview?.headers.length ?? 0} detected)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {columnMatch.map((cm) => (
                <div key={cm.header} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cm.ok ? "bg-green-500" : "bg-slate-300"}`} />
                  <span className="font-mono text-slate-700">{cm.header}</span>
                  {cm.maps_to && (
                    <span className="text-slate-500">→ <b>{cm.maps_to}</b></span>
                  )}
                </div>
              ))}
            </div>
            {columnMatch.some((c) => c.maps_to === "question") && columnMatch.some((c) => c.maps_to === "answer") ? (
              <div className="mt-3 text-xs text-green-700">✓ Required columns present.</div>
            ) : (
              <div className="mt-3 text-xs text-amber-800">
                ⚠ Missing <code>question</code> and/or <code>answer</code> column — the ingest will fail.
              </div>
            )}
          </div>
        )}

        {/* Sample rows */}
        {preview && preview.rows.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="text-xs font-medium text-slate-600 uppercase tracking-wide px-4 py-2 bg-slate-50 border-b border-slate-200">
              Sample rows (first 5)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {preview.headers.map((h, i) => (
                      <th key={i} className="px-3 py-1.5 text-left font-medium text-slate-600">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 text-slate-700 max-w-xs truncate">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            After upload, embeddings run automatically in the background (~1 min for 1k rows).
          </div>
          <button
            type="submit"
            disabled={busy || !file || (mode === "existing" ? !existingSlug : !newName.trim())}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload & ingest"}
          </button>
        </div>
      </form>

      {/* Job progress */}
      {jobId && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm font-medium">
            Job <span className="font-mono text-slate-500">{jobId.slice(0, 8)}</span>
            {lastProduct && (
              <span className="text-slate-500 font-normal ml-2">
                → {lastProduct.name} <code className="text-xs">({lastProduct.slug})</code>
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Status: <span className="font-mono">{snap?.status ?? "connecting…"}</span>
          </div>
          <div className="mt-2 h-2 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${Math.round((snap?.progress ?? 0) * 100)}%` }}
            />
          </div>
          {snap?.error && <div className="mt-2 text-sm text-red-600">{snap.error}</div>}
          {done && snap?.status === "succeeded" && (
            <div className="mt-2 text-sm text-emerald-700">
              Ingest complete. Embeddings will follow shortly (~1 minute).
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── helpers ─────────────────────────────────────────────────────

const CANONICAL: Record<string, string> = {
  question: "question", questions: "question", q: "question", prompt: "question",
  answer: "answer", response: "answer", a: "answer", reply: "answer",
  details: "details", detail: "details", notes: "details",
  external_id: "external_id", id: "external_id", question_id: "external_id",
  source: "source", url: "source",
  updated_at: "updated_at", last_updated: "updated_at", date: "updated_at",
};

function _matchColumns(headers: string[]): { header: string; ok: boolean; maps_to?: string }[] {
  return headers.map((h) => {
    const norm = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const maps_to = CANONICAL[norm];
    return { header: h, ok: !!maps_to, maps_to };
  });
}

function _parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { quoted = false; }
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"' && cur.length === 0) { quoted = true; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
