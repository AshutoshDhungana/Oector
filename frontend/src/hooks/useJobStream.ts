import { useEffect, useState } from "react";
import { api, JobSnapshot } from "../api";

export function useJobStream(jobId: string | null) {
  const [snap, setSnap] = useState<JobSnapshot | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setSnap(null);
    setDone(false);
    const es = new EventSource(api.jobs.streamUrl(jobId));
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as JobSnapshot;
        setSnap(data);
        if (["succeeded", "failed", "cancelled"].includes(data.status)) {
          setDone(true);
          es.close();
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      setDone(true);
    };
    return () => es.close();
  }, [jobId]);

  return { snap, done };
}
