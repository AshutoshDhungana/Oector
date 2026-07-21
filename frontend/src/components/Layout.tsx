import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { IndexPrepContext, useIndexPrep } from "../hooks/useIndexPrep";
import PrepBanner from "./PrepBanner";

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/questionnaires", label: "Answer questionnaire" },
  { to: "/library-health", label: "Library health" },
  { to: "/analytics", label: "Analytics" },
];

const LIBRARY_NAV = [
  { to: "/entries", label: "Entries" },
  { to: "/search", label: "Similarity search" },
  { to: "/outdated", label: "Freshness" },
  { to: "/merge", label: "Merge queue" },
];

const OTHER_NAV = [
  { to: "/import", label: "Import hub" },
  { to: "/compliance", label: "Auto-crawler" },
  { to: "/upload", label: "Bulk CSV upload" },
  { to: "/datasources", label: "Data sources" },
  { to: "/integrations", label: "Integrations" },
];

export default function Layout() {
  const { logout, demoMode } = useAuth();
  const navigate = useNavigate();
  const { status: prepStatus, refresh: refreshIndexStatus } = useIndexPrep();
  const outletContext: IndexPrepContext = { indexStatus: prepStatus, refreshIndexStatus };
  const signOut = () => { logout(); navigate("/login"); };

  return <div className="flex min-h-full bg-[#f5f7fb]">
    <aside className="app-sidebar hidden w-64 shrink-0 flex-col lg:flex">
      <div className="border-b border-white/10 px-5 py-6"><div className="brand-mark text-lg text-white">Oector<span>.</span></div><div className="mt-1 text-xs text-slate-400">Security assurance, on autopilot</div></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        <NavGroup items={PRIMARY_NAV} />
        <NavGroup label="Library" items={LIBRARY_NAV} />
        <NavGroup label="Platform" items={OTHER_NAV} />
        <div className="pt-2"><div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Public</div><a href="/trust/pitch-atlas" target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">Trust Center (Pitch Atlas) ↗</a></div>
      </nav>
      <div className="border-t border-white/10 p-4">{demoMode ? <div className="rounded-xl bg-white/[.06] px-3 py-2.5 text-xs text-slate-300"><div className="font-medium text-white">Investor demo</div><div className="mt-0.5 text-[10px] text-slate-400">Local presentation session</div></div> : null}<button className="mt-3 w-full text-left text-xs text-slate-400 hover:text-white" onClick={signOut}>Sign out</button></div>
    </aside>
    <main className="min-w-0 flex-1 overflow-auto">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 lg:hidden"><span className="brand-mark text-base text-slate-950">Oector<span>.</span></span><button onClick={signOut} className="text-xs font-semibold text-slate-600">Sign out</button></div>
      <div className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex"><div><div className="text-sm font-semibold text-slate-900">Oector workspace</div><div className="text-xs text-slate-500">Evidence, controls, and customer trust</div></div><div className="flex items-center gap-4"><a href="/trust/pitch-atlas" target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-600 hover:text-slate-950">View Trust Center ↗</a><button onClick={signOut} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-950">Sign out</button></div></div>
      <PrepBanner status={prepStatus} />
      <Outlet context={outletContext} />
    </main>
  </div>;
}

function NavGroup({ label, items }: { label?: string; items: { to: string; label: string; end?: boolean }[] }) {
  return <div>{label && <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>}<div className="space-y-0.5">{items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-sm transition ${isActive ? "bg-cyan-300 font-semibold text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>{item.label}</NavLink>)}</div></div>;
}
