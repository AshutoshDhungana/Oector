import { useState } from "react";
import { api } from "../api";
import { IndexStatus } from "../hooks/useIndexPrep";

/**
 * Sticky banner shown at the top of every page while index prep is running.
 * Data comes from the shared useIndexPrep hook — driven by server state (Redis)
 * so it survives tab switches, refreshes, and works across multiple tabs.
 */
export default function PrepBanner({ status }: { status: IndexStatus | null }) {
  const [dismissing, setDismissing] = useState(false);

  if (!status || !status.prep_in_progress) return null;

  const pct = Math.max(0, Math.min(100, status.prep_progress_pct ?? 0));
  const elapsed = Math.floor(status.prep_elapsed_seconds ?? 0);
  const steps = status.prep_steps ?? [];

  const dismiss = async () => {
    setDismissing(true);
    try { await api.admin.prepClear(); } finally { setDismissing(false); }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-3">
          <SpinnerIcon />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Preparing index</span>
              <span className="text-xs opacity-90">
                {pct.toFixed(0)}% · elapsed {_formatElapsed(elapsed)}
              </span>
              <span className="text-xs opacity-75 hidden sm:inline">
                — running in the background, safe to navigate away
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 bg-white/20 rounded overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <button
            onClick={dismiss}
            disabled={dismissing}
            className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
            title="Hide the banner. Jobs on the worker keep running."
          >
            Hide
          </button>
        </div>

        {/* Per-step chips (only if there are steps making progress) */}
        {steps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {steps.map((s) => {
              const doneOf = `${Math.min(s.done_now, s.target)} / ${s.target}`;
              const complete = s.done_now >= s.target;
              return (
                <span
                  key={s.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    complete
                      ? "bg-white/90 text-blue-800 border-white/70"
                      : "bg-white/10 text-white border-white/25"
                  }`}
                >
                  {complete ? "✓ " : ""}{s.label} · {doneOf}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function SpinnerIcon() {
  return (
    <svg className="w-5 h-5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 01-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}


function _formatElapsed(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
