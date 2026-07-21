/**
 * Typed client for the v2 API. Every call sends the bearer token from
 * localStorage and throws on non-2xx.
 */

export type Page<T> = {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
};

export type Product = { id: string; slug: string; name: string };

export type QAEntry = {
  id: string;
  product_id: string;
  external_id: string | null;
  question: string;
  answer: string;
  details: string | null;
  source: string | null;
  status: string;
  version: number;
  original_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SimilarityHit = { entry: QAEntry; score: number };

export type MergeSourceEntry = Pick<
  QAEntry,
  "id" | "external_id" | "question" | "answer" | "details" | "source" | "status" | "updated_at"
>;

export type MergeQueueItem = {
  id: string;
  product_id: string;
  primary_qa_id: string;
  secondary_qa_ids: string[];
  canonical_draft: {
    question?: string;
    answer?: string;
    details?: string;
    notes?: string[];
  } | null;
  llm_rationale: string | null;
  suggested_by: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  primary_entry: MergeSourceEntry | null;
  secondary_entries: MergeSourceEntry[];
};

export type OutdatedFlag = {
  qa_entry_id: string;
  status: "fresh" | "aging" | "outdated" | "stale" | "unknown";
  score: number;
  reason: string | null;
  updated_at: string;
  entry: {
    id: string;
    product_id: string;
    external_id: string | null;
    question: string;
    answer: string;
    source: string | null;
    original_updated_at: string | null;
    updated_at: string;
    status: string;
  } | null;
};

export type ComplianceSource = {
  id: string;
  name: string;
  url: string;
  kind: string;
  poll_interval_minutes: number;
  last_polled_at: string | null;
  enabled: boolean;
};

export type ComplianceChange = {
  id: string;
  source_id: string;
  detected_at: string;
  summary: string;
  impact_score: number;
  affected_qa_ids: string[];
};

export type DataSourceFile = {
  id: string;
  alias: string;
  filename: string;
  size_bytes: number;
  created_at: string;
};

export type DataSource = {
  id: string;
  product_id: string;
  name: string;
  kind: "csv_bundle" | "sql_query";
  config: Record<string, any>;
  enabled: boolean;
  poll_interval_minutes: number | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  files: DataSourceFile[];
};

export type HealthSummary = {
  product_slug: string | null;
  total: number;
  active: number;
  archived: number;
  by_status: Record<string, number>;
  average_score: number;
};

export type QuestionnaireOut = {
  id: string;
  product_id: string | null;
  name: string;
  customer: string | null;
  framework_hint: string | null;
  original_filename: string;
  file_kind: "xlsx" | "docx" | "pdf";
  status: "parsing" | "drafting" | "ready_for_review" | "in_review" | "completed";
  total_items: number;
  job_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type QuestionnaireItem = {
  id: string;
  questionnaire_id: string;
  row_index: number;
  section: string | null;
  framework_ref: string | null;
  question: string;
  drafted_answer: string | null;
  final_answer: string | null;
  citation_entry_ids: string[];
  confidence: number;
  verdict: "drafted" | "gap" | "pending";
  review_status: "pending" | "approved" | "edited" | "rejected";
  reviewed_at: string | null;
  reviewer_notes: string | null;
};

export type QuestionnaireDetail = {
  questionnaire: QuestionnaireOut;
  items: QuestionnaireItem[];
  stats: {
    total: number;
    approved: number;
    edited: number;
    rejected: number;
    pending: number;
    high_confidence: number;
    gaps: number;
    avg_confidence: number;
  };
};

export type QuestionnaireProgress = {
  id: string;
  status: QuestionnaireOut["status"];
  total_items: number;
  drafted_items: number;
  gap_items: number;
  updated_at: string;
};

export type AnswerResult = {
  question: string;
  verdict: "drafted" | "gap";
  answer: string | null;
  citations: string[];
  confidence: number;
  needs_review: boolean;
  reason: string;
  hits: { entry_id: string; question: string; answer: string; score: number }[];
};

export type Mapping = {
  framework: string;
  control_ref: string;
  domain: string | null;
  score: number;
  rationale: string | null;
};

export type FrameworkControl = {
  id: string;
  framework: string;
  control_id: string;
  domain: string | null;
  question: string;
  description: string | null;
};

export type Conflict = {
  id: string;
  entry_a_id: string;
  entry_b_id: string;
  severity: "low" | "medium" | "high";
  explanation: string;
  status: "open" | "dismissed" | "resolved";
  detected_at: string;
};

export type ConflictDetail = {
  conflict: Conflict;
  entry_a: QAEntry;
  entry_b: QAEntry;
};

export type AnalyticsOverview = {
  library_total: number;
  library_active: number;
  library_public: number;
  questionnaires_total: number;
  questionnaires_completed: number;
  items_total: number;
  items_approved: number;
  auto_answer_rate: number;
  avg_confidence: number;
  hours_saved: number;
  conflicts_open: number;
  frameworks_mapped: number;
  by_framework: Record<string, number>;
  by_status: Record<string, number>;
  top_products: { slug: string; name: string; active_entries: number; usage: number }[];
};

export type TrustEntry = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  frameworks: string[];
  updated_at: string;
};

export type TrustProfile = {
  slug: string;
  product_name: string;
  tagline: string;
  frameworks: string[];
  total_answers: number;
  categories: string[];
  entries: TrustEntry[];
};

export type JobSnapshot = {
  id?: string;
  kind?: string;
  status: string;
  progress: number;
  error: string | null;
};

const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8001";
const PREFIX = "/api/v1";

export const TOKEN_KEY = "kle_token";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const resp = await fetch(`${BASE}${PREFIX}${path}`, { ...init, headers });
  if (resp.status === 401) {
    setToken(null);
    throw new Error("unauthorized");
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${resp.statusText}: ${detail}`);
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

function qs(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  baseUrl: BASE,
  auth: {
    async login(email: string, password: string) {
      const body = new URLSearchParams({ username: email, password });
      const resp = await fetch(`${BASE}${PREFIX}/auth/login`, {
        method: "POST",
        body,
      });
      if (!resp.ok) throw new Error("login failed");
      const t = (await resp.json()) as { access_token: string; refresh_token: string };
      setToken(t.access_token);
      return t;
    },
    logout() {
      setToken(null);
    },
  },
  products: {
    list: () => req<Product[]>("/products"),
    create: (name: string, slug?: string) =>
      req<Product>("/products", { method: "POST", body: JSON.stringify({ name, slug }) }),
    delete: (slug: string) =>
      req<{
        deleted_product: Product;
        removed_data_sources: number;
        removed_files: number;
        cancelled_jobs: number;
        questionnaires_unlinked: boolean;
      }>(`/products/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  },
  entries: {
    list: (params: { product?: string; status?: string; q?: string; cursor?: string; limit?: number } = {}) =>
      req<Page<QAEntry>>(`/entries${qs(params)}`),
    get: (id: string) => req<QAEntry>(`/entries/${id}`),
    update: (id: string, body: Partial<Pick<QAEntry, "question" | "answer" | "details" | "source" | "status">>) =>
      req<QAEntry>(`/entries/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => req<void>(`/entries/${id}`, { method: "DELETE" }),
  },
  search: {
    similar: (text: string, product_slug?: string, k = 10) =>
      req<{ query: string; hits: SimilarityHit[] }>("/search/similar", {
        method: "POST",
        body: JSON.stringify({ text, product_slug, k }),
      }),
  },
  health: {
    summary: (product?: string) => req<HealthSummary>(`/health/summary${qs({ product })}`),
    outdated: (params: { product?: string; status?: string; cursor?: string; limit?: number } = {}) =>
      req<Page<OutdatedFlag>>(`/health/outdated${qs(params)}`),
    recheck: (entryId: string) =>
      req<{ queued: boolean }>(`/health/recheck/${entryId}`, { method: "POST" }),
  },
  merge: {
    queue: (params: { product?: string; status?: string; cursor?: string; limit?: number } = {}) =>
      req<Page<MergeQueueItem>>(`/merge/queue${qs(params)}`),
    approve: (id: string, canonical_override?: Record<string, string>) =>
      req<MergeQueueItem>(`/merge/queue/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ canonical_override }),
      }),
    reject: (id: string) => req<MergeQueueItem>(`/merge/queue/${id}/reject`, { method: "POST" }),
  },
  compliance: {
    listSources: () => req<ComplianceSource[]>("/compliance/sources"),
    addSource: (body: { name: string; url: string; kind?: string; poll_interval_minutes?: number }) =>
      req<ComplianceSource>("/compliance/sources", { method: "POST", body: JSON.stringify(body) }),
    patchSource: (id: string, body: { enabled?: boolean; poll_interval_minutes?: number }) =>
      req<ComplianceSource>(`/compliance/sources/${id}${qs(body as any)}`, { method: "PATCH" }),
    deleteSource: (id: string) =>
      req<void>(`/compliance/sources/${id}`, { method: "DELETE" }),
    crawlNow: (id: string) =>
      req<{ queued: boolean; task_id?: string }>(`/compliance/sources/${id}/crawl`, { method: "POST" }),
    crawlAll: () =>
      req<{ queued: boolean; task_id?: string }>(`/compliance/crawl-all`, { method: "POST" }),
    status: () =>
      req<{
        total_sources: number;
        enabled_sources: number;
        last_poll_at: string | null;
        changes_24h: number;
        total_changes: number;
        recent_crawls: {
          id: string; name: string; url: string; kind: string;
          last_polled_at: string | null; enabled: boolean;
        }[];
      }>(`/compliance/status`),
    changes: (params: { source_id?: string; cursor?: string; limit?: number } = {}) =>
      req<Page<ComplianceChange>>(`/compliance/changes${qs(params)}`),
  },
  admin: {
    indexStatus: () =>
      req<{
        ready_for_demo: boolean;
        google_api_key_set: boolean;
        llm_provider?: string;
        llm_base_url?: string;
        llm_model?: string;
        llm_configured?: boolean;
        entries_active: number;
        embeddings_count: number;
        embeddings_coverage_pct: number;
        framework_controls_total: number;
        framework_controls_embedded: number;
        clusters_ready_for_merge: number;
        entries_with_mappings: number;
        merge_queue_pending: number;
        conflicts_open: number;
        compliance_sources: number;
        prep_in_progress?: boolean;
        prep_started_at?: number | null;
        prep_elapsed_seconds?: number | null;
        prep_progress_pct?: number;
        prep_steps?: {
          id: string;
          label: string;
          target: number;
          baseline: number;
          done_now: number;
        }[];
      }>(`/admin/index-status`),
    prepClear: () => req<{ cleared: boolean }>(`/admin/prep-clear`, { method: "POST" }),
    prepareIndex: () =>
      req<{ ok: boolean; reason?: string; jobs?: Record<string, string> }>(
        `/admin/prepare-index`,
        { method: "POST" }
      ),
    recentActivity: (limit = 20) =>
      req<{ kind: string; ts: string; title: string; subtitle: string; href: string }[]>(
        `/admin/recent-activity${qs({ limit })}`
      ),
  },
  mergeExtra: {
    suggestBatch: (limit = 200) =>
      req<{ queued: boolean; task_id?: string; error?: string }>(
        `/merge/suggest${qs({ limit })}`,
        { method: "POST" }
      ),
  },
  jobs: {
    get: (id: string) => req<JobSnapshot>(`/jobs/${id}`),
    streamUrl: (id: string) => {
      // EventSource can't send Authorization headers, so we pass the JWT as a
      // query param and the server validates it exactly like a Bearer token.
      const t = getToken();
      return `${BASE}${PREFIX}/jobs/${id}/stream${t ? `?token=${encodeURIComponent(t)}` : ""}`;
    },
  },
  datasources: {
    list: (product?: string) =>
      req<DataSource[]>(`/datasources${qs({ product })}`),
    get: (id: string) => req<DataSource>(`/datasources/${id}`),
    create: (body: {
      product_slug: string;
      name: string;
      kind: "csv_bundle" | "sql_query";
      config?: Record<string, any>;
      enabled?: boolean;
      poll_interval_minutes?: number | null;
    }) => req<DataSource>("/datasources", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{
      name: string;
      config: Record<string, any>;
      enabled: boolean;
      poll_interval_minutes: number | null;
    }>) => req<DataSource>(`/datasources/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => req<void>(`/datasources/${id}`, { method: "DELETE" }),
    validate: (id: string) =>
      req<{ ok: boolean; error?: string }>(`/datasources/${id}/validate`, { method: "POST" }),
    testSql: (body: { dsn: string; query?: string; sample?: number }) =>
      req<{
        ok: boolean;
        dialect?: string;
        columns?: string[];
        row_count_estimate?: number | null;
        sample_rows?: Record<string, string | null>[];
        error?: string;
      }>(`/datasources/test-sql`, { method: "POST", body: JSON.stringify(body) }),
    sync: (id: string) => req<{ job_id: string }>(`/datasources/${id}/sync`, { method: "POST" }),
    uploadFile: async (id: string, alias: string, file: File) => {
      const form = new FormData();
      form.set("alias", alias);
      form.set("file", file);
      const t = getToken();
      const resp = await fetch(`${BASE}${PREFIX}/datasources/${id}/files`, {
        method: "POST",
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      return (await resp.json()) as DataSource;
    },
    deleteFile: (id: string, alias: string) =>
      req<void>(`/datasources/${id}/files/${encodeURIComponent(alias)}`, { method: "DELETE" }),
  },
  questionnaires: {
    list: (limit = 50) => req<QuestionnaireOut[]>(`/questionnaires${qs({ limit })}`),
    get: (id: string) => req<QuestionnaireDetail>(`/questionnaires/${id}`),
    progress: (id: string) => req<QuestionnaireProgress>(`/questionnaires/${id}/progress`),
    upload: async (opts: {
      file: File;
      productSlug?: string;
      customer?: string;
      frameworkHint?: string;
    }) => {
      const form = new FormData();
      form.set("file", opts.file);
      if (opts.productSlug) form.set("product_slug", opts.productSlug);
      if (opts.customer) form.set("customer", opts.customer);
      if (opts.frameworkHint) form.set("framework_hint", opts.frameworkHint);
      const t = getToken();
      const resp = await fetch(`${BASE}${PREFIX}/questionnaires`, {
        method: "POST",
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      return (await resp.json()) as QuestionnaireOut;
    },
    updateItem: (qid: string, itemId: string, body: { final_answer?: string; reviewer_notes?: string }) =>
      req<QuestionnaireItem>(`/questionnaires/${qid}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    approveItem: (qid: string, itemId: string, body: { final_answer?: string; reviewer_notes?: string; push_to_library?: boolean } = {}) =>
      req<QuestionnaireItem>(`/questionnaires/${qid}/items/${itemId}/approve`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    bulkApproveHigh: (qid: string, min_confidence = 0.75) =>
      req<{ approved: number; pushed_to_library: number }>(
        `/questionnaires/${qid}/items/bulk-approve`,
        { method: "POST", body: JSON.stringify({ min_confidence }) }
      ),
    rejectItem: (qid: string, itemId: string, body: { reviewer_notes?: string } = {}) =>
      req<QuestionnaireItem>(`/questionnaires/${qid}/items/${itemId}/reject`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    complete: (qid: string) =>
      req<QuestionnaireOut>(`/questionnaires/${qid}/complete`, { method: "POST" }),
    exportUrl: (qid: string) => `${BASE}${PREFIX}/questionnaires/${qid}/export`,
  },
  answer: {
    draft: (question: string, product_slug?: string, k?: number) =>
      req<AnswerResult>(`/answer`, {
        method: "POST",
        body: JSON.stringify({ question, product_slug, k }),
      }),
  },
  mappings: {
    forEntry: (entryId: string) => req<Mapping[]>(`/mappings/entry/${entryId}`),
    compute: (entryId: string, per_framework = 2, verify_with_llm = true) =>
      req<Mapping[]>(
        `/mappings/entry/${entryId}/compute${qs({ per_framework, verify_with_llm: String(verify_with_llm) })}`,
        { method: "POST" }
      ),
    frameworks: (framework?: string) =>
      req<FrameworkControl[]>(`/mappings/frameworks${qs({ framework })}`),
  },
  conflicts: {
    list: (status_?: string) => req<Conflict[]>(`/conflicts${qs({ status: status_ })}`),
    get: (id: string) => req<ConflictDetail>(`/conflicts/${id}`),
    dismiss: (id: string) => req<Conflict>(`/conflicts/${id}/dismiss`, { method: "POST" }),
    resolve: (id: string) => req<Conflict>(`/conflicts/${id}/resolve`, { method: "POST" }),
    scan: (product_slug?: string, max_pairs = 200) =>
      req<{ queued: boolean; task_id?: string; pairs_checked?: number; conflicts_found?: number }>(
        `/conflicts/scan${qs({ product_slug, max_pairs })}`,
        { method: "POST" }
      ),
  },
  analytics: {
    overview: () => req<AnalyticsOverview>(`/analytics/overview`),
    topQuestions: (limit = 25) => req<{ question: string; count: number }[]>(`/analytics/top-questions${qs({ limit })}`),
  },
  trust: {
    profile: (slug: string, opts: { q?: string; category?: string; limit?: number } = {}) =>
      req<TrustProfile>(`/trust/${slug}${qs({ ...opts })}`),
  },
  uploads: {
    csv: async (opts: { productSlug?: string; productName?: string; file: File }) => {
      const form = new FormData();
      if (opts.productSlug) form.set("product_slug", opts.productSlug);
      if (opts.productName) form.set("product_name", opts.productName);
      form.set("file", opts.file);
      const t = getToken();
      const resp = await fetch(`${BASE}${PREFIX}/uploads/csv`, {
        method: "POST",
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
        body: form,
      });
      if (!resp.ok) throw new Error(await resp.text());
      return (await resp.json()) as {
        job_id: string;
        upload_id: string;
        product: { id: string; slug: string; name: string };
      };
    },
  },
};
