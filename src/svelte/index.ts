import { hasNewFeature, getNewFeatures } from "../core";
import type {
  AudienceMatchFn,
  FeatureEntry,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";

type Subscriber<T> = (value: T) => void;
type Unsubscriber = () => void;

export interface FeatureDropSvelteState {
  manifest: FeatureManifest;
  newFeatures: FeatureEntry[];
  newCount: number;
  newFeaturesSorted: FeatureEntry[];
}

export interface FeatureDropSvelteStore {
  subscribe: (run: Subscriber<FeatureDropSvelteState>) => Unsubscriber;
  refresh: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => Promise<void>;
  isNew: (sidebarKey: string) => boolean;
  getFeature: (sidebarKey: string) => FeatureEntry | undefined;
}

export interface CreateFeatureDropStoreOptions {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
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
  options: CreateFeatureDropStoreOptions,
): FeatureDropSvelteStore {
  const listeners = new Set<Subscriber<FeatureDropSvelteState>>();

  const computeState = (): FeatureDropSvelteState => {
    const newFeatures = getNewFeatures(
      options.manifest,
      options.storage,
      new Date(),
      options.userContext,
      options.matchAudience,
      options.appVersion,
    );
    return {
      manifest: options.manifest,
      newFeatures,
      newCount: newFeatures.length,
      newFeaturesSorted: sortByPriority(newFeatures),
    };
  };

  let state = computeState();
  const emit = (): void => {
    state = computeState();
    for (const listener of listeners) {
      listener(state);
    }
  };

  const dismiss = (id: string): void => {
    options.storage.dismiss(id);
    emit();
  };

  const dismissAll = async (): Promise<void> => {
    await options.storage.dismissAll(new Date());
    emit();
  };

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
    state.newFeatures.find((f) => f.sidebarKey === sidebarKey);

  return {
    subscribe(run) {
      listeners.add(run);
      run(state);
      return () => {
        listeners.delete(run);
      };
    },
    refresh: emit,
    dismiss,
    dismissAll,
    isNew,
    getFeature,
  };
}

export function createNewCountStore(store: FeatureDropSvelteStore) {
  return {
    subscribe(run: Subscriber<number>) {
      return store.subscribe((state) => run(state.newCount));
    },
  };
}

export function createNewFeatureStore(
  store: FeatureDropSvelteStore,
  sidebarKey: string,
) {
  return {
    subscribe(run: Subscriber<{ isNew: boolean; feature: FeatureEntry | undefined }>) {
      return store.subscribe(() =>
        run({
          isNew: store.isNew(sidebarKey),
          feature: store.getFeature(sidebarKey),
        }),
      );
    },
  };
}

export interface TabNotificationOptions {
  enabled?: boolean;
  template?: string;
  flash?: boolean;
  flashInterval?: number;
}

export function attachTabNotification(
  store: FeatureDropSvelteStore,
  options: TabNotificationOptions = {},
): Unsubscriber {
  const {
    enabled = true,
    template = "({count}) {title}",
    flash = false,
    flashInterval = 1500,
  } = options;

  if (typeof document === "undefined") {
    return () => {};
  }

  const originalTitle = document.title;
  let interval: ReturnType<typeof setInterval> | null = null;

  const unsubscribe = store.subscribe((state) => {
    if (!enabled || state.newCount === 0) {
      document.title = originalTitle;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      return;
    }

    const notificationTitle = template
      .replace("{count}", String(state.newCount))
      .replace("{title}", originalTitle);

    if (!flash) {
      document.title = notificationTitle;
      return;
    }

    let showNotification = true;
    document.title = notificationTitle;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      showNotification = !showNotification;
      document.title = showNotification ? notificationTitle : originalTitle;
    }, flashInterval);
  });

  return () => {
    unsubscribe();
    document.title = originalTitle;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}
