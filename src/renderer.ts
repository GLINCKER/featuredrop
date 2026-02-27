import { getNewFeatures } from "./core";
import type {
  AudienceMatchFn,
  FeatureEntry,
  FeatureDependencyState,
  FeatureFlagBridge,
  FeatureManifest,
  StorageAdapter,
  TriggerContext,
  UserContext,
} from "./types";

export interface ChangelogRendererOptions {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
  dependencyState?: FeatureDependencyState;
  triggerContext?: TriggerContext;
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
  dependencyState: FeatureDependencyState;
  triggerContext?: TriggerContext;
}

export interface ChangelogRendererActions {
  refresh: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => Promise<void>;
  setManifest: (manifest: FeatureManifest) => void;
  setUserContext: (userContext?: UserContext) => void;
  setAppVersion: (appVersion?: string) => void;
  setAudienceMatcher: (matchAudience?: AudienceMatchFn) => void;
  setDependencyState: (dependencyState?: FeatureDependencyState) => void;
  markFeatureSeen: (featureId: string) => void;
  markFeatureClicked: (featureId: string) => void;
  setFlagBridge: (flagBridge?: FeatureFlagBridge) => void;
  setTriggerContext: (triggerContext?: TriggerContext) => void;
  setTriggerPath: (path: string) => void;
  trackUsageEvent: (event: string, delta?: number) => void;
  trackTriggerEvent: (event: string) => void;
  trackMilestone: (event: string) => void;
  setTriggerElapsedMs: (elapsedMs: number) => void;
  setTriggerScrollPercent: (scrollPercent: number) => void;
  setTriggerMetadata: (metadata: Record<string, unknown>) => void;
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
  destroy: () => void;
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

function cloneDependencyState(
  dependencyState: FeatureDependencyState | undefined,
  dismissedIds: ReadonlySet<string>,
): FeatureDependencyState {
  return {
    seenIds: new Set(dependencyState?.seenIds ?? []),
    clickedIds: new Set(dependencyState?.clickedIds ?? []),
    dismissedIds: new Set(dependencyState?.dismissedIds ?? dismissedIds),
  };
}

function cloneTriggerContext(context?: TriggerContext): TriggerContext | undefined {
  if (!context) return undefined;
  return {
    path: context.path,
    events: new Set(context.events ?? []),
    milestones: new Set(context.milestones ?? []),
    usage: { ...(context.usage ?? {}) },
    elapsedMs: context.elapsedMs,
    scrollPercent: context.scrollPercent,
    metadata: { ...(context.metadata ?? {}) },
  };
}

export function createChangelogRenderer({
  manifest: initialManifest,
  storage,
  userContext: initialUserContext,
  matchAudience: initialMatchAudience,
  appVersion: initialAppVersion,
  dependencyState: initialDependencyState,
  triggerContext: initialTriggerContext,
  flagBridge: initialFlagBridge,
  product: initialProduct,
  now = () => new Date(),
}: ChangelogRendererOptions): ChangelogRenderer {
  let manifest = initialManifest;
  let userContext = initialUserContext;
  let matchAudience = initialMatchAudience;
  let appVersion = initialAppVersion;
  let dependencyState = cloneDependencyState(
    initialDependencyState,
    storage.getDismissedIds(),
  );
  let triggerContext = cloneTriggerContext(initialTriggerContext);
  let flagBridge = initialFlagBridge;
  let product = initialProduct;
  let destroyed = false;

  const listeners = new Set<(state: ChangelogRendererState) => void>();
  let state: ChangelogRendererState = {
    manifest,
    newFeatures: [],
    newFeaturesSorted: [],
    newCount: 0,
    watermark: storage.getWatermark(),
    dismissedIds: new Set(storage.getDismissedIds()),
    dependencyState,
    triggerContext,
  };

  const refresh = () => {
    if (destroyed) return;
    const features = getNewFeatures(
      manifest,
      storage,
      now(),
      userContext,
      matchAudience,
      appVersion,
      dependencyState,
      triggerContext,
      flagBridge,
      product,
    );
    const dismissedIds = storage.getDismissedIds();
    dependencyState = cloneDependencyState(dependencyState, dismissedIds);

    state = {
      manifest,
      newFeatures: features,
      newFeaturesSorted: sortFeatures(features),
      newCount: features.length,
      watermark: storage.getWatermark(),
      dismissedIds: new Set(dismissedIds),
      dependencyState,
      triggerContext,
    };

    listeners.forEach((listener) => listener(state));
  };

  const dismiss = (id: string) => {
    if (destroyed) return;
    if (!id) return;
    storage.dismiss(id);
    refresh();
  };

  const dismissAll = async () => {
    if (destroyed) return;
    await storage.dismissAll(now());
    refresh();
  };

  const setManifest = (nextManifest: FeatureManifest) => {
    if (destroyed) return;
    manifest = nextManifest;
    refresh();
  };

  const setUserContext = (nextUserContext?: UserContext) => {
    if (destroyed) return;
    userContext = nextUserContext;
    refresh();
  };

  const setAppVersion = (nextAppVersion?: string) => {
    if (destroyed) return;
    appVersion = nextAppVersion;
    refresh();
  };

  const setAudienceMatcher = (nextMatchAudience?: AudienceMatchFn) => {
    if (destroyed) return;
    matchAudience = nextMatchAudience;
    refresh();
  };

  const setDependencyState = (nextDependencyState?: FeatureDependencyState) => {
    if (destroyed) return;
    dependencyState = cloneDependencyState(nextDependencyState, storage.getDismissedIds());
    refresh();
  };

  const markFeatureSeen = (featureId: string) => {
    if (destroyed || !featureId) return;
    const seenIds = new Set(dependencyState.seenIds ?? []);
    seenIds.add(featureId);
    dependencyState = { ...dependencyState, seenIds };
    refresh();
  };

  const markFeatureClicked = (featureId: string) => {
    if (destroyed || !featureId) return;
    const clickedIds = new Set(dependencyState.clickedIds ?? []);
    clickedIds.add(featureId);
    dependencyState = { ...dependencyState, clickedIds };
    refresh();
  };

  const setFlagBridge = (nextFlagBridge?: FeatureFlagBridge) => {
    if (destroyed) return;
    flagBridge = nextFlagBridge;
    refresh();
  };

  const setTriggerContext = (nextTriggerContext?: TriggerContext) => {
    if (destroyed) return;
    triggerContext = cloneTriggerContext(nextTriggerContext);
    refresh();
  };

  const setTriggerPath = (path: string) => {
    if (destroyed) return;
    triggerContext = { ...(triggerContext ?? {}), path };
    refresh();
  };

  const trackUsageEvent = (event: string, delta = 1) => {
    if (destroyed || !event) return;
    const usage = { ...(triggerContext?.usage ?? {}) };
    usage[event] = (usage[event] ?? 0) + Math.max(1, delta);
    triggerContext = { ...(triggerContext ?? {}), usage };
    refresh();
  };

  const trackTriggerEvent = (event: string) => {
    if (destroyed || !event) return;
    const events = new Set(triggerContext?.events ?? []);
    events.add(event);
    triggerContext = { ...(triggerContext ?? {}), events };
    refresh();
  };

  const trackMilestone = (event: string) => {
    if (destroyed || !event) return;
    const milestones = new Set(triggerContext?.milestones ?? []);
    milestones.add(event);
    triggerContext = { ...(triggerContext ?? {}), milestones };
    refresh();
  };

  const setTriggerElapsedMs = (elapsedMs: number) => {
    if (destroyed) return;
    triggerContext = { ...(triggerContext ?? {}), elapsedMs: Math.max(0, elapsedMs) };
    refresh();
  };

  const setTriggerScrollPercent = (scrollPercent: number) => {
    if (destroyed) return;
    const clamped = Math.max(0, Math.min(100, scrollPercent));
    triggerContext = { ...(triggerContext ?? {}), scrollPercent: clamped };
    refresh();
  };

  const setTriggerMetadata = (metadata: Record<string, unknown>) => {
    if (destroyed) return;
    triggerContext = { ...(triggerContext ?? {}), metadata: { ...metadata } };
    refresh();
  };

  const setProduct = (nextProduct?: string) => {
    if (destroyed) return;
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
    if (destroyed) {
      return () => {
        // noop
      };
    }
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  };

  const destroy = () => {
    destroyed = true;
    listeners.clear();
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
      setDependencyState,
      markFeatureSeen,
      markFeatureClicked,
      setFlagBridge,
      setTriggerContext,
      setTriggerPath,
      trackUsageEvent,
      trackTriggerEvent,
      trackMilestone,
      setTriggerElapsedMs,
      setTriggerScrollPercent,
      setTriggerMetadata,
      setProduct,
    },
    computed: {
      isNew,
      getFeature,
      getFeatureById,
      getFeaturesByCategory,
    },
    subscribe,
    destroy,
  };
}
