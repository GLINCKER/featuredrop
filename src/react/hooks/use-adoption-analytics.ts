import { useMemo } from "react";
import type { AdoptionEvent } from "../../analytics";
import { createAdoptionMetrics, type AdoptionMetrics } from "../../analytics";

export function useAdoptionAnalytics(events: AdoptionEvent[]): AdoptionMetrics {
  return useMemo(() => createAdoptionMetrics(events), [events]);
}
