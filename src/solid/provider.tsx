import { createComponent, createEffect, type JSX } from "solid-js";
import type {
  AnalyticsCallbacks,
  AudienceMatchFn,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";
import { FeatureDropSolidContext } from "./context";
import { createFeatureDropStore, type FeatureDropSolidStore } from "./store";

export interface FeatureDropProviderProps {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  analytics?: AnalyticsCallbacks;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
  children?: JSX.Element;
}

export function FeatureDropProvider(props: FeatureDropProviderProps): JSX.Element {
  const store: FeatureDropSolidStore = createFeatureDropStore({
    manifest: props.manifest,
    storage: props.storage,
    analytics: props.analytics,
    userContext: props.userContext,
    matchAudience: props.matchAudience,
    appVersion: props.appVersion,
  });

  createEffect(() => {
    void props.manifest;
    void props.storage;
    void props.analytics;
    void props.userContext;
    void props.matchAudience;
    void props.appVersion;
    store.refresh();
  });

  return createComponent(FeatureDropSolidContext.Provider, {
    value: store,
    get children() {
      return props.children;
    },
  });
}
