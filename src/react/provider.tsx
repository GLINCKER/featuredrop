import { useState, useCallback, useMemo, type ReactNode } from "react";
import type { FeatureManifest, StorageAdapter } from "../types";
import { getNewFeatures, hasNewFeature } from "../core";
import { FeatureDropContext } from "./context";

export interface FeatureDropProviderProps {
  /** The feature manifest — typically a frozen array of FeatureEntry objects */
  manifest: FeatureManifest;
  /** Storage adapter instance (e.g. LocalStorageAdapter, MemoryAdapter) */
  storage: StorageAdapter;
  children: ReactNode;
}

/**
 * Provides feature discovery state to the component tree.
 *
 * Wrap your app (or a subtree) with this provider to enable
 * `useFeatureDrop`, `useNewFeature`, and `useNewCount` hooks.
 */
export function FeatureDropProvider({
  manifest,
  storage,
  children,
}: FeatureDropProviderProps) {
  const [newFeatures, setNewFeatures] = useState(() =>
    getNewFeatures(manifest, storage),
  );

  const recompute = useCallback(() => {
    setNewFeatures(getNewFeatures(manifest, storage));
  }, [manifest, storage]);

  const dismiss = useCallback(
    (id: string) => {
      storage.dismiss(id);
      recompute();
    },
    [storage, recompute],
  );

  const dismissAll = useCallback(async () => {
    await storage.dismissAll(new Date());
    setNewFeatures([]);
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

  const value = useMemo(
    () => ({
      newFeatures,
      newCount: newFeatures.length,
      isNew: isNewFn,
      dismiss,
      dismissAll,
      getFeature,
    }),
    [newFeatures, isNewFn, dismiss, dismissAll, getFeature],
  );

  return (
    <FeatureDropContext.Provider value={value}>
      {children}
    </FeatureDropContext.Provider>
  );
}
