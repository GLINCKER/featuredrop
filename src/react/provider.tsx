import { useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import type { FeatureManifest, StorageAdapter, AnalyticsCallbacks } from "../types";
import { getNewFeatures, hasNewFeature } from "../core";
import { getFeatureById } from "../helpers";
import { FeatureDropContext } from "./context";

export interface FeatureDropProviderProps {
  /** The feature manifest — typically a frozen array of FeatureEntry objects */
  manifest: FeatureManifest;
  /** Storage adapter instance (e.g. LocalStorageAdapter, MemoryAdapter) */
  storage: StorageAdapter;
  /** Optional analytics callbacks — pipe to your analytics provider */
  analytics?: AnalyticsCallbacks;
  children: ReactNode;
}

/**
 * Provides feature discovery state to the component tree.
 *
 * Wrap your app (or a subtree) with this provider to enable
 * `useFeatureDrop`, `useNewFeature`, `useNewCount`, and other hooks.
 */
export function FeatureDropProvider({
  manifest,
  storage,
  analytics,
  children,
}: FeatureDropProviderProps) {
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  const [newFeatures, setNewFeatures] = useState(() =>
    getNewFeatures(manifest, storage),
  );

  const recompute = useCallback(() => {
    setNewFeatures(getNewFeatures(manifest, storage));
  }, [manifest, storage]);

  const dismiss = useCallback(
    (id: string) => {
      const feature = getFeatureById(manifest, id);
      storage.dismiss(id);
      if (feature) {
        analyticsRef.current?.onFeatureDismissed?.(feature);
      }
      recompute();
    },
    [manifest, storage, recompute],
  );

  const dismissAll = useCallback(async () => {
    await storage.dismissAll(new Date());
    setNewFeatures([]);
    analyticsRef.current?.onAllDismissed?.();
  }, [storage]);

  const isNewFn = useCallback(
    (sidebarKey: string) => hasNewFeature(manifest, sidebarKey, storage),
    [manifest, storage],
  );

  const getFeature = useCallback(
    (sidebarKey: string) =>
      newFeatures.find((f) => f.sidebarKey === sidebarKey),
    [newFeatures],
  );

  const newFeaturesSorted = useMemo(() => {
    const priorityOrder = { critical: 0, normal: 1, low: 2 };
    return [...newFeatures].sort((a, b) => {
      const pa = priorityOrder[a.priority ?? "normal"];
      const pb = priorityOrder[b.priority ?? "normal"];
      if (pa !== pb) return pa - pb;
      return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
    });
  }, [newFeatures]);

  const value = useMemo(
    () => ({
      newFeatures,
      newCount: newFeatures.length,
      newFeaturesSorted,
      isNew: isNewFn,
      dismiss,
      dismissAll,
      getFeature,
    }),
    [newFeatures, newFeaturesSorted, isNewFn, dismiss, dismissAll, getFeature],
  );

  return (
    <FeatureDropContext.Provider value={value}>
      {children}
    </FeatureDropContext.Provider>
  );
}
