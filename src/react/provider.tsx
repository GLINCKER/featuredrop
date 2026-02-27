import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type {
  AudienceMatchFn,
  AnalyticsCallbacks,
  FeatureDropAnimationPreset,
  FeatureFlagBridge,
  FeatureManifest,
  FeaturePriority,
  StorageAdapter,
  TriggerContext,
  UserContext,
} from "../types";
import type { ThrottleOptions } from "../throttle";
import type { AdoptionEventInput, AnalyticsCollector } from "../analytics";
import { prefersReducedMotion, resolveAnimationPreset } from "../animation";
import { getNewFeatures } from "../core";
import { getFeatureById } from "../helpers";
import { applyAnnouncementThrottle } from "../throttle";
import { TriggerEngine } from "../triggers";
import {
  getLocaleDirection,
  resolveLocale,
  resolveTranslations,
  type FeatureDropTranslations,
} from "../i18n";
import {
  applyFeatureVariants,
  getFeatureVariantName,
  getOrCreateVariantKey,
} from "../variants";
import { FeatureDropContext } from "./context";

const QUIET_MODE_STORAGE_KEY = "featuredrop:quiet-mode";
const SEEN_FEATURES_STORAGE_KEY = "featuredrop:seen-features";
const CLICKED_FEATURES_STORAGE_KEY = "featuredrop:clicked-features";

function getCurrentPath(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getScrollPercent(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const root = document.documentElement;
  const max = root.scrollHeight - window.innerHeight;
  if (max <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((window.scrollY / max) * 100)));
}

function readQuietMode(): boolean {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (key: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(QUIET_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeQuietMode(enabled: boolean): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (key: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(QUIET_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // noop
  }
}

function readIdSet(key: string): Set<string> {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (storageKey: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return new Set<string>();
  try {
    const raw = storage.getItem(key);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeIdSet(key: string, values: ReadonlySet<string>): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (storageKey: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(key, JSON.stringify(Array.from(values)));
  } catch {
    // noop
  }
}

interface FeatureState {
  allFeatures: ReturnType<typeof getNewFeatures>;
  visibleFeatures: ReturnType<typeof getNewFeatures>;
  queuedFeatures: ReturnType<typeof getNewFeatures>;
}

function computeFeatureState({
  manifest,
  storage,
  now,
  userContext,
  matchAudience,
  appVersion,
  product,
  throttle,
  sessionStartedAt,
  quietMode,
  seenFeatureIds,
  clickedFeatureIds,
  triggerContext,
  flagBridge,
}: {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  now: Date;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
  product?: string;
  throttle?: ThrottleOptions;
  sessionStartedAt: number;
  quietMode: boolean;
  seenFeatureIds: ReadonlySet<string>;
  clickedFeatureIds: ReadonlySet<string>;
  triggerContext?: TriggerContext;
  flagBridge?: FeatureFlagBridge;
}): FeatureState {
  const dismissedIds = storage.getDismissedIds();
  const allFeatures = getNewFeatures(
    manifest,
    storage,
    now,
    userContext,
    matchAudience,
    appVersion,
    {
      seenIds: seenFeatureIds,
      clickedIds: clickedFeatureIds,
      dismissedIds,
    },
    triggerContext,
    flagBridge,
    product,
  );

  const throttled = applyAnnouncementThrottle(
    allFeatures,
    throttle,
    {
      sessionStartedAt,
      quietMode,
    },
    now.getTime(),
  );

  return {
    allFeatures,
    visibleFeatures: throttled.visible,
    queuedFeatures: throttled.queued,
  };
}

export interface FeatureDropProviderProps {
  /** The feature manifest — typically a frozen array of FeatureEntry objects */
  manifest: FeatureManifest;
  /** Storage adapter instance (e.g. LocalStorageAdapter, MemoryAdapter) */
  storage: StorageAdapter;
  /** Optional analytics callbacks — pipe to your analytics provider */
  analytics?: AnalyticsCallbacks;
  /** Optional error callback for monitoring caught component errors */
  onError?: (error: unknown, context?: { component?: string; componentStack?: string }) => void;
  /** User context for audience targeting (plan, role, region, traits) */
  userContext?: UserContext;
  /** Custom audience matcher — overrides default AND/OR matching logic */
  matchAudience?: AudienceMatchFn;
  /** Current app version (semver) for version-pinned features */
  appVersion?: string;
  /** Current product scope for multi-product manifests */
  product?: string;
  /** Announcement throttling and session cooldown controls */
  throttle?: ThrottleOptions;
  /** Stable identifier for A/B variant assignment (e.g. userId) */
  variantKey?: string;
  /** Optional adoption analytics collector */
  collector?: AnalyticsCollector;
  /** Feature flag bridge for evaluating `feature.flagKey` visibility */
  flagBridge?: FeatureFlagBridge;
  /** Locale code for built-in component translations (e.g. "en", "fr", "es") */
  locale?: string;
  /** Animation preset for built-in component transitions */
  animation?: FeatureDropAnimationPreset;
  /** Custom translation overrides for built-in component strings */
  translations?: Partial<FeatureDropTranslations>;
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
  onError,
  userContext,
  matchAudience: matchAudienceFn,
  appVersion,
  product,
  throttle,
  variantKey,
  collector,
  flagBridge,
  locale = "en",
  animation = "normal",
  translations: translationOverrides,
  children,
}: FeatureDropProviderProps) {
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  const sessionStartedAtRef = useRef(Date.now());
  const lastModalAtRef = useRef<number | null>(null);
  const lastTourAtRef = useRef<number | null>(null);
  const activeSpotlightIdsRef = useRef(new Set<string>());
  const triggerEngineRef = useRef<TriggerEngine | null>(null);
  if (!triggerEngineRef.current) {
    triggerEngineRef.current = new TriggerEngine({
      path: getCurrentPath(),
      scrollPercent: getScrollPercent(),
    });
  }
  const lastScrollPercentRef = useRef<number>(getScrollPercent());
  const [triggerVersion, setTriggerVersion] = useState(0);
  const [quietMode, setQuietModeState] = useState(() => readQuietMode());
  const [toastShownIds, setToastShownIds] = useState<Set<string>>(new Set());
  const [activeSpotlightIds, setActiveSpotlightIds] = useState<Set<string>>(new Set());
  const [seenFeatureIds, setSeenFeatureIds] = useState<Set<string>>(
    () => readIdSet(SEEN_FEATURES_STORAGE_KEY),
  );
  const [clickedFeatureIds, setClickedFeatureIds] = useState<Set<string>>(
    () => readIdSet(CLICKED_FEATURES_STORAGE_KEY),
  );
  const resolvedVariantKey = useMemo(() => getOrCreateVariantKey(variantKey), [variantKey]);
  const resolvedLocale = useMemo(() => resolveLocale(locale), [locale]);
  const direction = useMemo(() => getLocaleDirection(resolvedLocale), [resolvedLocale]);
  const resolvedAnimation = useMemo(
    () => resolveAnimationPreset(animation, { reducedMotion: prefersReducedMotion() }),
    [animation],
  );
  const translations = useMemo(
    () => resolveTranslations(resolvedLocale, translationOverrides),
    [resolvedLocale, translationOverrides],
  );
  const resolvedManifest = useMemo(
    () => applyFeatureVariants(manifest, resolvedVariantKey),
    [manifest, resolvedVariantKey],
  );
  const [featureState, setFeatureState] = useState<FeatureState>(() =>
    computeFeatureState({
      manifest: resolvedManifest,
      storage,
      now: new Date(),
      userContext,
      matchAudience: matchAudienceFn,
      appVersion,
      product,
      throttle,
      sessionStartedAt: sessionStartedAtRef.current,
      quietMode: readQuietMode(),
      seenFeatureIds: readIdSet(SEEN_FEATURES_STORAGE_KEY),
      clickedFeatureIds: readIdSet(CLICKED_FEATURES_STORAGE_KEY),
      triggerContext: (() => {
        const engine = triggerEngineRef.current;
        if (!engine) return undefined;
        engine.setElapsedMs(Date.now() - sessionStartedAtRef.current);
        return engine.getContext();
      })(),
      flagBridge,
    }),
  );

  const recompute = useCallback(() => {
    const engine = triggerEngineRef.current;
    let triggerContext: TriggerContext | undefined;
    if (engine) {
      engine.setElapsedMs(Date.now() - sessionStartedAtRef.current);
      triggerContext = engine.getContext();
    }

    setFeatureState(
      computeFeatureState({
        manifest: resolvedManifest,
        storage,
        now: new Date(),
        userContext,
        matchAudience: matchAudienceFn,
        appVersion,
        product,
        throttle,
        sessionStartedAt: sessionStartedAtRef.current,
        quietMode,
        seenFeatureIds,
        clickedFeatureIds,
        triggerContext,
        flagBridge,
      }),
    );
  }, [
    resolvedManifest,
    storage,
    userContext,
    matchAudienceFn,
    appVersion,
    product,
    throttle,
    quietMode,
    seenFeatureIds,
    clickedFeatureIds,
    triggerVersion,
    flagBridge,
  ]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const hasTimeTriggers = useMemo(
    () => resolvedManifest.some((feature) => feature.trigger?.type === "time"),
    [resolvedManifest],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updatePath = () => {
      triggerEngineRef.current?.setPath(getCurrentPath());
      setTriggerVersion((value) => value + 1);
    };
    window.addEventListener("popstate", updatePath);
    window.addEventListener("hashchange", updatePath);
    return () => {
      window.removeEventListener("popstate", updatePath);
      window.removeEventListener("hashchange", updatePath);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateScroll = () => {
      const percent = getScrollPercent();
      if (percent === lastScrollPercentRef.current) return;
      lastScrollPercentRef.current = percent;
      triggerEngineRef.current?.setScrollPercent(percent);
      setTriggerVersion((value) => value + 1);
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  useEffect(() => {
    if (!hasTimeTriggers) return;
    const timer = setInterval(() => {
      setTriggerVersion((value) => value + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [hasTimeTriggers]);

  useEffect(() => {
    const sessionCooldown = throttle?.sessionCooldown;
    if (!sessionCooldown || sessionCooldown <= 0) return;
    const elapsed = Date.now() - sessionStartedAtRef.current;
    const remaining = sessionCooldown - elapsed;
    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      recompute();
    }, remaining + 5);
    return () => clearTimeout(timer);
  }, [recompute, throttle?.sessionCooldown]);

  useEffect(() => {
    let changed = false;
    const next = new Set(seenFeatureIds);
    for (const feature of featureState.visibleFeatures) {
      if (next.has(feature.id)) continue;
      next.add(feature.id);
      changed = true;
    }
    if (!changed) return;
    setSeenFeatureIds(next);
    writeIdSet(SEEN_FEATURES_STORAGE_KEY, next);
  }, [featureState.visibleFeatures, seenFeatureIds]);

  const dismiss = useCallback(
    (id: string) => {
      const feature = getFeatureById(resolvedManifest, id);
      storage.dismiss(id);
      if (feature) {
        analyticsRef.current?.onFeatureDismissed?.(feature);
      }
      collector?.track({
        type: "feature_dismissed",
        featureId: id,
        variant: feature ? getFeatureVariantName(feature) : undefined,
      });
      recompute();
    },
    [collector, resolvedManifest, storage, recompute],
  );

  const dismissAll = useCallback(async () => {
    await storage.dismissAll(new Date());
    analyticsRef.current?.onAllDismissed?.();
    recompute();
  }, [recompute, storage]);

  const inSessionCooldown = useCallback((now: number): boolean => {
    const sessionCooldown = throttle?.sessionCooldown ?? 0;
    if (!sessionCooldown || sessionCooldown <= 0) return false;
    return now - sessionStartedAtRef.current < sessionCooldown;
  }, [throttle?.sessionCooldown]);

  const shouldSuppressForQuietMode = useCallback((priority?: FeaturePriority): boolean => {
    if (!throttle?.respectDoNotDisturb || !quietMode) return false;
    return priority !== "critical";
  }, [quietMode, throttle?.respectDoNotDisturb]);

  const getRemainingToastSlots = useCallback((): number => {
    const maxToastsPerSession = throttle?.maxToastsPerSession;
    if (!maxToastsPerSession || maxToastsPerSession <= 0) return Number.POSITIVE_INFINITY;
    return Math.max(0, maxToastsPerSession - toastShownIds.size);
  }, [throttle?.maxToastsPerSession, toastShownIds.size]);

  const markToastsShown = useCallback((featureIds: string[]) => {
    if (featureIds.length === 0) return;
    setToastShownIds((previous) => {
      let changed = false;
      const next = new Set(previous);
      for (const id of featureIds) {
        if (!id || next.has(id)) continue;
        next.add(id);
        changed = true;
      }
      return changed ? next : previous;
    });
  }, []);

  const canShowModal = useCallback((priority?: FeaturePriority): boolean => {
    const now = Date.now();
    if (inSessionCooldown(now)) return false;
    if (shouldSuppressForQuietMode(priority)) return false;
    const minTime = throttle?.minTimeBetweenModals ?? 0;
    const lastShown = lastModalAtRef.current;
    if (minTime > 0 && lastShown && now - lastShown < minTime) return false;
    return true;
  }, [inSessionCooldown, shouldSuppressForQuietMode, throttle?.minTimeBetweenModals]);

  const markModalShown = useCallback(() => {
    lastModalAtRef.current = Date.now();
  }, []);

  const canShowTour = useCallback((): boolean => {
    const now = Date.now();
    if (inSessionCooldown(now)) return false;
    if (shouldSuppressForQuietMode(undefined)) return false;
    const minTime = throttle?.minTimeBetweenTours ?? 0;
    const lastShown = lastTourAtRef.current;
    if (minTime > 0 && lastShown && now - lastShown < minTime) return false;
    return true;
  }, [inSessionCooldown, shouldSuppressForQuietMode, throttle?.minTimeBetweenTours]);

  const markTourShown = useCallback(() => {
    lastTourAtRef.current = Date.now();
  }, []);

  const acquireSpotlightSlot = useCallback((id: string, priority?: FeaturePriority): boolean => {
    if (!id) return false;
    if (shouldSuppressForQuietMode(priority)) return false;
    const current = activeSpotlightIdsRef.current;
    if (current.has(id)) return true;
    const maxSpotlights = throttle?.maxSimultaneousSpotlights;
    if (maxSpotlights && maxSpotlights > 0 && current.size >= maxSpotlights) return false;
    const next = new Set(current);
    next.add(id);
    activeSpotlightIdsRef.current = next;
    setActiveSpotlightIds(next);
    return true;
  }, [shouldSuppressForQuietMode, throttle?.maxSimultaneousSpotlights]);

  const releaseSpotlightSlot = useCallback((id: string) => {
    if (!id) return;
    const current = activeSpotlightIdsRef.current;
    if (!current.has(id)) return;
    const next = new Set(current);
    next.delete(id);
    activeSpotlightIdsRef.current = next;
    setActiveSpotlightIds(next);
  }, []);

  const setQuietMode = useCallback((enabled: boolean) => {
    setQuietModeState(enabled);
    writeQuietMode(enabled);
  }, []);

  const markFeatureSeen = useCallback((featureId: string) => {
    setSeenFeatureIds((previous) => {
      if (previous.has(featureId)) return previous;
      const next = new Set(previous);
      next.add(featureId);
      writeIdSet(SEEN_FEATURES_STORAGE_KEY, next);
      const feature = getFeatureById(resolvedManifest, featureId);
      collector?.track({
        type: "feature_seen",
        featureId,
        variant: feature ? getFeatureVariantName(feature) : undefined,
      });
      return next;
    });
  }, [collector, resolvedManifest]);

  const markFeatureClicked = useCallback((featureId: string) => {
    setClickedFeatureIds((previous) => {
      if (previous.has(featureId)) return previous;
      const next = new Set(previous);
      next.add(featureId);
      writeIdSet(CLICKED_FEATURES_STORAGE_KEY, next);
      const feature = getFeatureById(resolvedManifest, featureId);
      collector?.track({
        type: "feature_clicked",
        featureId,
        variant: feature ? getFeatureVariantName(feature) : undefined,
      });
      return next;
    });
  }, [collector, resolvedManifest]);

  const trackAdoptionEvent = useCallback((event: AdoptionEventInput) => {
    if (!collector) return;
    const feature = event.featureId ? getFeatureById(resolvedManifest, event.featureId) : undefined;
    collector.track({
      ...event,
      variant: event.variant ?? (feature ? getFeatureVariantName(feature) : undefined),
    });
  }, [collector, resolvedManifest]);

  const reportError = useCallback(
    (error: unknown, context?: { component?: string; componentStack?: string }) => {
      onError?.(error, context);
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[featuredrop] component error", context?.component, error);
      }
    },
    [onError],
  );

  const trackUsageEvent = useCallback((event: string, delta = 1) => {
    if (!event) return;
    triggerEngineRef.current?.trackUsage(event, delta);
    setTriggerVersion((value) => value + 1);
  }, []);

  const trackTriggerEvent = useCallback((event: string) => {
    if (!event) return;
    triggerEngineRef.current?.trackEvent(event);
    setTriggerVersion((value) => value + 1);
  }, []);

  const trackMilestone = useCallback((event: string) => {
    if (!event) return;
    triggerEngineRef.current?.trackMilestone(event);
    setTriggerVersion((value) => value + 1);
  }, []);

  const setTriggerPath = useCallback((path: string) => {
    if (!path) return;
    triggerEngineRef.current?.setPath(path);
    setTriggerVersion((value) => value + 1);
  }, []);

  const isNewFn = useCallback(
    (sidebarKey: string) =>
      featureState.visibleFeatures.some((feature) => feature.sidebarKey === sidebarKey),
    [featureState.visibleFeatures],
  );

  const getFeature = useCallback(
    (sidebarKey: string) =>
      featureState.visibleFeatures.find((feature) => feature.sidebarKey === sidebarKey),
    [featureState.visibleFeatures],
  );

  const newFeaturesSorted = useMemo(() => {
    const priorityOrder = { critical: 0, normal: 1, low: 2 };
    return [...featureState.visibleFeatures].sort((a, b) => {
      const pa = priorityOrder[a.priority ?? "normal"];
      const pb = priorityOrder[b.priority ?? "normal"];
      if (pa !== pb) return pa - pb;
      return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
    });
  }, [featureState.visibleFeatures]);

  const value = useMemo(
    () => ({
      manifest: resolvedManifest,
      newFeatures: featureState.visibleFeatures,
      queuedFeatures: featureState.queuedFeatures,
      newCount: featureState.visibleFeatures.length,
      totalNewCount: featureState.allFeatures.length,
      newFeaturesSorted,
      isNew: isNewFn,
      dismiss,
      dismissAll,
      getFeature,
      quietMode,
      setQuietMode,
      markFeatureSeen,
      markFeatureClicked,
      getRemainingToastSlots,
      markToastsShown,
      canShowModal,
      markModalShown,
      canShowTour,
      markTourShown,
      acquireSpotlightSlot,
      releaseSpotlightSlot,
      activeSpotlightCount: activeSpotlightIds.size,
      trackAdoptionEvent,
      reportError,
      locale: resolvedLocale,
      direction,
      animation: resolvedAnimation,
      translations,
      trackUsageEvent,
      trackTriggerEvent,
      trackMilestone,
      setTriggerPath,
    }),
    [
      resolvedManifest,
      featureState.visibleFeatures,
      featureState.queuedFeatures,
      featureState.allFeatures.length,
      newFeaturesSorted,
      isNewFn,
      dismiss,
      dismissAll,
      getFeature,
      quietMode,
      setQuietMode,
      markFeatureSeen,
      markFeatureClicked,
      getRemainingToastSlots,
      markToastsShown,
      canShowModal,
      markModalShown,
      canShowTour,
      markTourShown,
      acquireSpotlightSlot,
      releaseSpotlightSlot,
      activeSpotlightIds.size,
      trackAdoptionEvent,
      reportError,
      resolvedLocale,
      direction,
      resolvedAnimation,
      translations,
      trackUsageEvent,
      trackTriggerEvent,
      trackMilestone,
      setTriggerPath,
    ],
  );

  return (
    <FeatureDropContext.Provider value={value}>
      {children}
    </FeatureDropContext.Provider>
  );
}
