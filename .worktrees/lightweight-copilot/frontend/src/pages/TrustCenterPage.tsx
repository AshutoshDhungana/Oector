import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, TrustProfile } from "../api";

/** Public Trust Center — no auth required. Reads a curated slice of the library. */
export default function TrustCenterPage() {
  const { slug = "atlas" } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api.trust
        .profile(slug, { q: query || undefined, category: category || undefined, limit: 100 })
        .then((next) => {
          if (!cancelled) setProfile(next);
        })
        .catch(() => {
          if (!cancelled) setProfile(null);
        });
    }, query ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, query, category]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-xs font-mono text-blue-600 uppercase tracking-widest">
            Trust Center · {profile.slug}
          </div>
          <h1 className="text-4xl font-semibold text-slate-900 mt-2">{profile.product_name}</h1>
          <p className="text-lg text-slate-600 mt-2">{profile.tagline}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {profile.frameworks.map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
              >
                {f}
              </span>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Public answers</div>
              <div className="text-2xl font-semibold text-slate-900">{profile.total_answers}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Frameworks mapped</div>
              <div className="text-2xl font-semibold text-slate-900">{profile.frameworks.length}</div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Categories</div>
              <div className="text-2xl font-semibold text-slate-900">{profile.categories.length}</div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Request full trust pack
            </button>
            <button className="px-4 py-2 rounded border border-slate-300 text-sm hover:bg-slate-50">
              Download SOC 2 (NDA)
            </button>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            placeholder="Search security & compliance answers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {profile.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Entries */}
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {profile.entries.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              No published answers matching your search.
            </div>
          )}
          {profile.entries.map((e) => (
            <div key={e.id} className="p-5">
              <button
                className="w-full text-left flex items-start gap-3"
                onClick={() => toggle(e.id)}
              >
                <span className="text-slate-400 mt-0.5">{openIds.has(e.id) ? "▾" : "▸"}</span>
                <div className="flex-1">
                  <div className="text-slate-900 font-medium">{e.question}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {e.category && (
                      <span className="text-slate-500">{e.category}</span>
                    )}
                    {e.frameworks.length > 0 && (
                      <span className="text-slate-400">·</span>
                    )}
                    {e.frameworks.slice(0, 4).map((f) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
              {openIds.has(e.id) && (
                <div className="mt-3 ml-6 text-slate-700 whitespace-pre-wrap">
                  {e.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-lg bg-slate-900 text-white p-6">
          <div className="text-lg font-medium">Need something not listed here?</div>
          <div className="text-slate-300 mt-1 text-sm">
            Send us your questionnaire — Trust Copilot auto-drafts answers with citations,
            and our security team reviews before it lands in your inbox.
          </div>
          <button className="mt-4 px-4 py-2 rounded bg-white text-slate-900 text-sm font-medium hover:bg-slate-100">
            Contact security team
          </button>
        </div>
      </div>
    </div>
  );
}
