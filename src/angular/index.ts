import { getNewFeatures, hasNewFeature } from "../core";
import type {
  AnalyticsCallbacks,
  AudienceMatchFn,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";

export interface SignalLike<T> {
  (): T;
  set: (value: T) => void;
}

export type CreateSignalLikeFn = <T>(initial: T) => SignalLike<T>;

export interface AngularFeatureDropOptions {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  createSignal: CreateSignalLikeFn;
  analytics?: AnalyticsCallbacks;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
}

export interface AngularFeatureDropService {
  manifest: FeatureManifest;
  newFeatures: SignalLike<FeatureEntry[]>;
  newCount: () => number;
  newFeaturesSorted: () => FeatureEntry[];
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

export function createFeatureDropService(
  options: AngularFeatureDropOptions,
): AngularFeatureDropService {
  const computeFeatures = (): FeatureEntry[] =>
    getNewFeatures(
      options.manifest,
      options.storage,
      new Date(),
      options.userContext,
      options.matchAudience,
      options.appVersion,
    );

  const newFeatures = options.createSignal(computeFeatures());

  const refresh = (): void => {
    newFeatures.set(computeFeatures());
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
    newFeatures().find((feature) => feature.sidebarKey === sidebarKey);

  return {
    manifest: options.manifest,
    newFeatures,
    newCount,
    newFeaturesSorted: () => sortByPriority(newFeatures()),
    refresh,
    dismiss,
    dismissAll,
    isNew,
    getFeature,
  };
}

export class FeatureDropService {
  readonly manifest: FeatureManifest;
  readonly newFeatures: SignalLike<FeatureEntry[]>;

  private readonly service: AngularFeatureDropService;

  constructor(options: AngularFeatureDropOptions) {
    this.service = createFeatureDropService(options);
    this.manifest = this.service.manifest;
    this.newFeatures = this.service.newFeatures;
  }

  newCount(): number {
    return this.service.newCount();
  }

  newFeaturesSorted(): FeatureEntry[] {
    return this.service.newFeaturesSorted();
  }

  refresh(): void {
    this.service.refresh();
  }

  dismiss(id: string): void {
    this.service.dismiss(id);
  }

  dismissAll(): Promise<void> {
    return this.service.dismissAll();
  }

  isNew(sidebarKey: string): boolean {
    return this.service.isNew(sidebarKey);
  }

  getFeature(sidebarKey: string): FeatureEntry | undefined {
    return this.service.getFeature(sidebarKey);
  }
}
