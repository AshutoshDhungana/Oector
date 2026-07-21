import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { IndexPrepContext, useIndexPrep } from "../hooks/useIndexPrep";
import PrepBanner from "./PrepBanner";
import CopilotPanel from "./CopilotPanel";

const PRIMARY_NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/questionnaires", label: "📋 Answer questionnaire" },
  { to: "/library-health", label: "🩺 Library health" },
  { to: "/analytics", label: "📊 Analytics" },
];

const LIBRARY_NAV = [
  { to: "/entries", label: "Entries" },
  { to: "/search", label: "Similarity search" },
  { to: "/outdated", label: "Freshness" },
  { to: "/merge", label: "Merge queue" },
];

const OTHER_NAV = [
  { to: "/import", label: "🔌 Import hub" },
  { to: "/compliance", label: "🌐 Auto-crawler" },
  { to: "/upload", label: "Bulk CSV upload" },
  { to: "/datasources", label: "Data sources" },
  { to: "/integrations", label: "Integrations" },
];


export default function Layout() {
  const { logout, demoMode } = useAuth();
  const navigate = useNavigate();
  const { status: prepStatus, refresh: refreshIndexStatus } = useIndexPrep();
  const outletContext: IndexPrepContext = {
    indexStatus: prepStatus,
    refreshIndexStatus,
  };

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="text-base font-semibold text-slate-900">Trust Copilot</div>
          <div className="text-xs text-slate-500">Security assurance, on autopilot</div>
        </div>
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
          <NavGroup items={PRIMARY_NAV} />
          <NavGroup label="Library" items={LIBRARY_NAV} />
          <NavGroup label="Platform" items={OTHER_NAV} />
          <div className="pt-2">
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Public
            </div>
            <a
              href="/trust/pitch-atlas"
              target="_blank"
              rel="noreferrer"
              className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              🌐 Trust Center (Pitch Atlas)
            </a>
          </div>
        </nav>
        <div className="border-t border-slate-200 p-3">
          {demoMode ? (
            <div className="text-xs text-slate-500">
              <div>Demo mode · no auth</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Investor prototype build</div>
            </div>
          ) : (
            <button
              className="w-full text-left text-xs text-slate-500 hover:text-slate-800"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <PrepBanner status={prepStatus} />
        <Outlet context={outletContext} />
      </main>
      <CopilotPanel />
    </div>
  );
}

function NavGroup({ label, items }: { label?: string; items: { to: string; label: string; end?: boolean }[] }) {
  return (
    <div>
      {label && (
        <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
