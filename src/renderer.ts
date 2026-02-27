import { getNewFeatures } from "./core";
import type {
  AudienceMatchFn,
  FeatureEntry,
  FeatureFlagBridge,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "./types";

export interface ChangelogRendererOptions {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
  flagBridge?: FeatureFlagBridge;
  product?: string;
  now?: () => Date;
}

export interface ChangelogRendererState {
  manifest: FeatureManifest;
  newFeatures: FeatureEntry[];
  newFeaturesSorted: FeatureEntry[];
  newCount: number;
  watermark: string | null;
  dismissedIds: ReadonlySet<string>;
}

export interface ChangelogRendererActions {
  refresh: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => Promise<void>;
  setManifest: (manifest: FeatureManifest) => void;
  setUserContext: (userContext?: UserContext) => void;
  setAppVersion: (appVersion?: string) => void;
  setAudienceMatcher: (matchAudience?: AudienceMatchFn) => void;
  setFlagBridge: (flagBridge?: FeatureFlagBridge) => void;
  setProduct: (product?: string) => void;
}

export interface ChangelogRendererComputed {
  isNew: (sidebarKey: string) => boolean;
  getFeature: (sidebarKey: string) => FeatureEntry | undefined;
  getFeatureById: (id: string) => FeatureEntry | undefined;
  getFeaturesByCategory: (category: string) => FeatureEntry[];
}

export interface ChangelogRenderer {
  readonly state: ChangelogRendererState;
  readonly actions: ChangelogRendererActions;
  readonly computed: ChangelogRendererComputed;
  subscribe: (listener: (state: ChangelogRendererState) => void) => () => void;
}

function sortFeatures(features: readonly FeatureEntry[]): FeatureEntry[] {
  const priorityOrder = { critical: 0, normal: 1, low: 2 };
  return [...features].sort((a, b) => {
    const pa = priorityOrder[a.priority ?? "normal"];
    const pb = priorityOrder[b.priority ?? "normal"];
    if (pa !== pb) return pa - pb;
    return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
  });
}

export function createChangelogRenderer({
  manifest: initialManifest,
  storage,
  userContext: initialUserContext,
  matchAudience: initialMatchAudience,
  appVersion: initialAppVersion,
  flagBridge: initialFlagBridge,
  product: initialProduct,
  now = () => new Date(),
}: ChangelogRendererOptions): ChangelogRenderer {
  let manifest = initialManifest;
  let userContext = initialUserContext;
  let matchAudience = initialMatchAudience;
  let appVersion = initialAppVersion;
  let flagBridge = initialFlagBridge;
  let product = initialProduct;

  const listeners = new Set<(state: ChangelogRendererState) => void>();
  let state: ChangelogRendererState = {
    manifest,
    newFeatures: [],
    newFeaturesSorted: [],
    newCount: 0,
    watermark: storage.getWatermark(),
    dismissedIds: new Set(storage.getDismissedIds()),
  };

  const refresh = () => {
    const features = getNewFeatures(
      manifest,
      storage,
      now(),
      userContext,
      matchAudience,
      appVersion,
      undefined,
      undefined,
      flagBridge,
      product,
    );

    state = {
      manifest,
      newFeatures: features,
      newFeaturesSorted: sortFeatures(features),
      newCount: features.length,
      watermark: storage.getWatermark(),
      dismissedIds: new Set(storage.getDismissedIds()),
    };

    listeners.forEach((listener) => listener(state));
  };

  const dismiss = (id: string) => {
    if (!id) return;
    storage.dismiss(id);
    refresh();
  };

  const dismissAll = async () => {
    await storage.dismissAll(now());
    refresh();
  };

  const setManifest = (nextManifest: FeatureManifest) => {
    manifest = nextManifest;
    refresh();
  };

  const setUserContext = (nextUserContext?: UserContext) => {
    userContext = nextUserContext;
    refresh();
  };

  const setAppVersion = (nextAppVersion?: string) => {
    appVersion = nextAppVersion;
    refresh();
  };

  const setAudienceMatcher = (nextMatchAudience?: AudienceMatchFn) => {
    matchAudience = nextMatchAudience;
    refresh();
  };

  const setFlagBridge = (nextFlagBridge?: FeatureFlagBridge) => {
    flagBridge = nextFlagBridge;
    refresh();
  };

  const setProduct = (nextProduct?: string) => {
    product = nextProduct;
    refresh();
  };

  const isNew = (sidebarKey: string): boolean =>
    state.newFeatures.some((feature) => feature.sidebarKey === sidebarKey);

  const getFeature = (sidebarKey: string): FeatureEntry | undefined =>
    state.newFeatures.find((feature) => feature.sidebarKey === sidebarKey);

  const getFeatureById = (id: string): FeatureEntry | undefined =>
    state.newFeatures.find((feature) => feature.id === id);

  const getFeaturesByCategory = (category: string): FeatureEntry[] =>
    state.newFeatures.filter((feature) => feature.category === category);

  const subscribe = (listener: (nextState: ChangelogRendererState) => void): (() => void) => {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  };

  refresh();

  return {
    get state() {
      return state;
    },
    actions: {
      refresh,
      dismiss,
      dismissAll,
      setManifest,
      setUserContext,
      setAppVersion,
      setAudienceMatcher,
      setFlagBridge,
      setProduct,
    },
    computed: {
      isNew,
      getFeature,
      getFeatureById,
      getFeaturesByCategory,
    },
    subscribe,
  };
}
