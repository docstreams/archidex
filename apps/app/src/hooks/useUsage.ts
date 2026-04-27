import { useState, useEffect, useCallback, useRef } from "react";
import type { UsageResponse } from "@/lib/types";
import { getUsage } from "@/lib/api";

const POLL_INTERVAL = 10_000; // 10 seconds

export function useUsage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getUsage();
      setUsage(data);
    } catch {
      // Silently ignore — panel just shows stale data
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    refresh();

    // Poll periodically
    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { usage, refreshUsage: refresh };
}
