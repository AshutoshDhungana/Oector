import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Product, QuestionnaireOut } from "../api";

export default function QuestionnaireUploadPage() {
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [productSlug, setProductSlug] = useState<string>("");
  const [customer, setCustomer] = useState("");
  const [framework, setFramework] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<QuestionnaireOut[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api.products.list().then(setProducts).catch(() => setProducts([]));
    api.questionnaires.list(10).then(setRecent).catch(() => setRecent([]));
  }, []);

  const onSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const q = await api.questionnaires.upload({
        file,
        productSlug: productSlug || undefined,
        customer: customer || undefined,
        frameworkHint: framework || undefined,
      });
      nav(`/questionnaires/${q.id}/review`);
    } catch (err: any) {
      setError(err?.message ?? "upload failed");
    } finally {
      setBusy(false);
    }
  }, [file, productSlug, customer, framework, nav]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Answer a questionnaire</h1>
        <p className="text-slate-600 mt-1">
          Drop in an xlsx, docx, or pdf. Trust Copilot parses it, drafts answers with citations,
          and hands you a review queue.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            dragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400"
          }`}
          onClick={() => document.getElementById("questionnaire-file-input")?.click()}
        >
          <input
            id="questionnaire-file-input"
            type="file"
            className="hidden"
            accept=".xlsx,.xlsm,.docx,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <div className="text-slate-800 font-medium">{file.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div className="text-slate-500">
              <div className="text-lg mb-1">Drop a questionnaire file here</div>
              <div className="text-xs">or click to browse (xlsx / docx / pdf)</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Product (scope)
            </span>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={productSlug}
              onChange={(e) => setProductSlug(e.target.value)}
            >
              <option value="">Any product</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Customer (optional)
            </span>
            <input
              type="text"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Acme Corp"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Framework hint
            </span>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
            >
              <option value="">Auto-detect</option>
              <option value="CAIQ">CAIQ</option>
              <option value="SIG">SIG</option>
              <option value="ISO27001">ISO 27001</option>
              <option value="SOC2">SOC 2</option>
              <option value="NIST-CSF">NIST CSF</option>
              <option value="Custom">Custom</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="rounded bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Supported: <span className="font-mono">.xlsx .docx .pdf</span> · max ~10 MB
          </div>
          <button
            type="submit"
            disabled={!file || busy}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload & draft answers"}
          </button>
        </div>
      </form>

      {recent.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Recent questionnaires</h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {recent.map((q) => (
              <div
                key={q.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                onClick={() => nav(`/questionnaires/${q.id}/review`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800 truncate">{q.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {q.customer ? `${q.customer} · ` : ""}
                    {new Date(q.created_at).toLocaleString()} · {q.total_items} questions
                  </div>
                </div>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    parsing: "bg-slate-100 text-slate-700",
    drafting: "bg-amber-100 text-amber-800",
    ready_for_review: "bg-blue-100 text-blue-700",
    in_review: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
  };
  const cls = colors[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
