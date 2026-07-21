import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export type IndexStatus = Awaited<ReturnType<typeof api.admin.indexStatus>>;

export type IndexPrepContext = {
  indexStatus: IndexStatus | null;
  refreshIndexStatus: () => Promise<void>;
};

const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 30_000;
const HIDDEN_TAB_POLL_MS = 60_000;

/**
 * Shared index-preparation state.
 *
 * The Layout owns the single hook instance and exposes it through Outlet
 * context. Polling is frequent only while prep is active, slows down while
 * idle, and avoids requests in background tabs.
 */
export function useIndexPrep(): {
  status: IndexStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<IndexStatus | null> => {
    try {
      const next = await api.admin.indexStatus();
      setStatus(next);
      setError(null);
      return next;
    } catch (err: any) {
      setError(err?.message ?? "failed to load index status");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer: number | undefined;

    const schedule = (delay: number) => {
      if (!cancelled) timer = window.setTimeout(poll, delay);
    };

    async function poll() {
      if (cancelled || inFlight) return;
      if (document.hidden) {
        schedule(HIDDEN_TAB_POLL_MS);
        return;
      }

      inFlight = true;
      const next = await load();
      inFlight = false;
      if (cancelled) return;
      schedule(next?.prep_in_progress ? ACTIVE_POLL_MS : IDLE_POLL_MS);
    }

    const onVisibilityChange = () => {
      if (!document.hidden) {
        if (timer !== undefined) {
          window.clearTimeout(timer);
          timer = undefined;
        }
        void poll();
      }
    };

    void poll();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load]);

  return { status, loading, error, refresh };
}
