import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, DataSource } from "../api";
import ProductSelect from "../components/ProductSelect";
import { useJobStream } from "../hooks/useJobStream";

type Kind = "csv_bundle" | "sql_query";

const DEFAULT_CSV_CONFIG = {
  main_alias: "main",
  mapping: {
    question: "main.question",
    answer: "main.answer",
    external_id: "main.id",
    updated_at: "main.updated_at",
    details: "main.details",
  },
  joins: [],
};

const DEFAULT_SQL_CONFIG = {
  dsn: "postgresql+psycopg://user:pass@host:5432/db",
  query: "SELECT id, question_text, answer_text, updated_at FROM kb WHERE deleted_at IS NULL",
  mapping: {
    external_id: "id",
    question: "question_text",
    answer: "answer_text",
    updated_at: "updated_at",
  },
  chunk_size: 1000,
};

export default function DataSourcesPage() {
  const [product, setProduct] = useState("");
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(() => sources.find((s) => s.id === selectedId) || null, [sources, selectedId]);

  async function reload() {
    try {
      const rows = await api.datasources.list(product || undefined);
      setSources(rows);
      if (selectedId && !rows.find((r) => r.id === selectedId)) setSelectedId(null);
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    reload();
  }, [product]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Data sources</h1>
        <ProductSelect
          value={product}
          onChange={setProduct}
          className="ml-auto rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
        />
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5 space-y-2">
          <CreateSourceForm onCreated={reload} defaultProduct={product} />
          <div className="space-y-1">
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded-lg border p-3 hover:bg-slate-50 ${
                  selectedId === s.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{s.name}</span>
                  <span className="text-xs rounded bg-slate-100 px-2 py-0.5">{s.kind}</span>
                  {!s.enabled && <span className="text-xs text-slate-400">disabled</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {s.last_synced_at
                    ? `synced ${new Date(s.last_synced_at).toLocaleString()}`
                    : "never synced"}
                  {s.last_error && <span className="ml-2 text-red-600">error</span>}
                </div>
              </button>
            ))}
            {sources.length === 0 && (
              <div className="text-sm text-slate-500 text-center p-4">No sources yet.</div>
            )}
          </div>
        </div>

        <div className="col-span-7">
          {selected ? <SourceDetail source={selected} onChange={reload} /> : (
            <div className="text-slate-500 rounded-lg border border-dashed border-slate-300 p-8 text-center">
              Pick a source on the left, or create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateSourceForm({ onCreated, defaultProduct }: { onCreated: () => void; defaultProduct: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("csv_bundle");
  const [product, setProduct] = useState(defaultProduct);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setProduct(defaultProduct), [defaultProduct]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!product) {
      setErr("pick a product first");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.datasources.create({
        product_slug: product,
        name,
        kind,
        config: kind === "csv_bundle" ? DEFAULT_CSV_CONFIG : DEFAULT_SQL_CONFIG,
      });
      setName("");
      setOpen(false);
      onCreated();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        className="w-full rounded border border-dashed border-slate-300 py-2 text-sm hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        + New data source
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
    >
      <div className="text-sm font-medium">New data source</div>
      <input
        className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <select
          className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          <option value="csv_bundle">CSV bundle</option>
          <option value="sql_query">SQL query</option>
        </select>
        <ProductSelect value={product} onChange={setProduct} allowAll={false} />
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy} className="rounded bg-blue-600 text-white px-3 py-1.5 text-sm">
          {busy ? "…" : "Create"}
        </button>
        <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function SourceDetail({ source, onChange }: { source: DataSource; onChange: () => void }) {
  const [configText, setConfigText] = useState(JSON.stringify(source.config, null, 2));
  const [pollMin, setPollMin] = useState<string>(source.poll_interval_minutes?.toString() ?? "");
  const [enabled, setEnabled] = useState(source.enabled);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const { snap, done } = useJobStream(jobId);

  useEffect(() => {
    setConfigText(JSON.stringify(source.config, null, 2));
    setPollMin(source.poll_interval_minutes?.toString() ?? "");
    setEnabled(source.enabled);
  }, [source.id]);

  async function save() {
    setErr(null);
    try {
      const config = JSON.parse(configText);
      await api.datasources.update(source.id, {
        config,
        enabled,
        poll_interval_minutes: pollMin.trim() ? Number(pollMin) : null,
      });
      setNotice("Saved.");
      setTimeout(() => setNotice(null), 3000);
      onChange();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function validate() {
    setErr(null);
    const r = await api.datasources.validate(source.id);
    if (r.ok) setNotice("Validated ✓");
    else setErr(r.error || "invalid");
    setTimeout(() => setNotice(null), 3000);
  }

  async function syncNow() {
    setErr(null);
    const r = await api.datasources.sync(source.id);
    setJobId(r.job_id);
  }

  async function remove() {
    if (!confirm(`Delete data source "${source.name}"?`)) return;
    await api.datasources.delete(source.id);
    onChange();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>, alias: string) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await api.datasources.uploadFile(source.id, alias, f);
      onChange();
    } catch (e) {
      setErr(String(e));
    }
    e.target.value = "";
  }

  const [newAlias, setNewAlias] = useState("");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold">{source.name}</div>
        <span className="text-xs rounded bg-slate-100 px-2 py-0.5">{source.kind}</span>
        <div className="ml-auto flex gap-2">
          <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={validate}>Validate</button>
          <button className="rounded bg-blue-600 text-white px-3 py-1 text-sm" onClick={syncNow}>Sync now</button>
          <button className="rounded border border-red-400 text-red-600 px-3 py-1 text-sm" onClick={remove}>Delete</button>
        </div>
      </div>

      {source.last_error && (
        <div className="rounded bg-red-50 border border-red-200 text-red-700 p-2 text-sm">
          Last error: {source.last_error}
        </div>
      )}
      {notice && <div className="rounded bg-emerald-50 border border-emerald-200 text-emerald-700 p-2 text-sm">{notice}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {source.kind === "csv_bundle" && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Files</div>
          <div className="space-y-1">
            {source.files.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-sm border-b border-slate-100 py-1">
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{f.alias}</code>
                <span className="text-slate-600 truncate">{f.filename}</span>
                <span className="ml-auto text-xs text-slate-400">{(f.size_bytes / 1024).toFixed(1)} KB</span>
                <button
                  className="text-xs text-red-600 ml-2"
                  onClick={async () => {
                    await api.datasources.deleteFile(source.id, f.alias);
                    onChange();
                  }}
                >
                  remove
                </button>
              </div>
            ))}
            {source.files.length === 0 && <div className="text-sm text-slate-500">No files yet.</div>}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              className="rounded border border-slate-300 px-3 py-1.5 text-sm w-40"
              placeholder="alias (e.g. main)"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
            />
            <input
              type="file"
              accept=".csv"
              className="text-sm"
              disabled={!newAlias.trim()}
              onChange={(e) => onFileChange(e, newAlias.trim())}
            />
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-medium mb-1">Config (JSON)</div>
        <textarea
          className="w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono h-64"
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        <label className="flex items-center gap-2">
          Poll every
          <input
            type="number"
            min={0}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
            value={pollMin}
            onChange={(e) => setPollMin(e.target.value)}
          />
          minutes (blank = manual only)
        </label>
        <button className="ml-auto rounded bg-blue-600 text-white px-3 py-1 text-sm" onClick={save}>Save</button>
      </div>

      {jobId && (
        <div className="rounded border border-slate-200 p-3 space-y-2">
          <div className="text-sm">Sync job {jobId.slice(0, 8)} — <span className="font-mono">{snap?.status ?? "connecting…"}</span></div>
          <div className="h-2 bg-slate-100 rounded overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.round((snap?.progress ?? 0) * 100)}%` }} />
          </div>
          {snap?.error && <div className="text-sm text-red-600">{snap.error}</div>}
          {done && snap?.status === "succeeded" && (
            <div className="text-sm text-emerald-700">Sync complete. Embeddings will follow shortly.</div>
          )}
        </div>
      )}
    </div>
  );
}
