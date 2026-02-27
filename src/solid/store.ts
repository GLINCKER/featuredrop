import { createSignal, type Accessor } from "solid-js";
import { getNewFeatures, hasNewFeature } from "../core";
import type {
  AnalyticsCallbacks,
  AudienceMatchFn,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";

export interface CreateFeatureDropSolidStoreOptions {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  analytics?: AnalyticsCallbacks;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
}

export interface FeatureDropSolidStore {
  manifest: Accessor<FeatureManifest>;
  newFeatures: Accessor<FeatureEntry[]>;
  newCount: Accessor<number>;
  newFeaturesSorted: Accessor<FeatureEntry[]>;
  refresh: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => Promise<void>;
  isNew: (sidebarKey: string) => boolean;
  getFeature: (sidebarKey: string) => FeatureEntry | undefined;
}

function sortByPriority(features: FeatureEntry[]): FeatureEntry[] {
  const priorityOrder = { critical: 0, normal: 1, low: 2 };
  return [...features].sort((a, b) => {
    const pa = priorityOrder[a.priority ?? "normal"];
    const pb = priorityOrder[b.priority ?? "normal"];
    if (pa !== pb) return pa - pb;
    return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
  });
}

export function createFeatureDropStore(
  options: CreateFeatureDropSolidStoreOptions,
): FeatureDropSolidStore {
  const [manifest, setManifest] = createSignal(options.manifest);
  const [newFeatures, setNewFeatures] = createSignal(
    getNewFeatures(
      options.manifest,
      options.storage,
      new Date(),
      options.userContext,
      options.matchAudience,
      options.appVersion,
    ),
  );

  const refresh = (): void => {
    setManifest(options.manifest);
    setNewFeatures(
      getNewFeatures(
        options.manifest,
        options.storage,
        new Date(),
        options.userContext,
        options.matchAudience,
        options.appVersion,
      ),
    );
  };

  const dismiss = (id: string): void => {
    const feature = newFeatures().find((item) => item.id === id);
    options.storage.dismiss(id);
    if (feature) {
      options.analytics?.onFeatureDismissed?.(feature);
    }
    refresh();
  };

  const dismissAll = async (): Promise<void> => {
    await options.storage.dismissAll(new Date());
    options.analytics?.onAllDismissed?.();
    refresh();
  };

  const newCount = (): number => newFeatures().length;
  const newFeaturesSorted = (): FeatureEntry[] => sortByPriority(newFeatures());

  const isNew = (sidebarKey: string): boolean =>
    hasNewFeature(
      options.manifest,
      sidebarKey,
      options.storage,
      new Date(),
      options.userContext,
      options.matchAudience,
      options.appVersion,
    );

  const getFeature = (sidebarKey: string): FeatureEntry | undefined =>
    newFeatures().find((item) => item.sidebarKey === sidebarKey);

  return {
    manifest,
    newFeatures,
    newCount,
    newFeaturesSorted,
    refresh,
    dismiss,
    dismissAll,
    isNew,
    getFeature,
  };
}
