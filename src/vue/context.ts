import type { ComputedRef, InjectionKey, Ref } from "vue";
import type { FeatureEntry, FeatureManifest } from "../types";

export interface FeatureDropVueContextValue {
  manifest: FeatureManifest;
  newFeatures: Ref<FeatureEntry[]>;
  newCount: ComputedRef<number>;
  newFeaturesSorted: ComputedRef<FeatureEntry[]>;
  isNew: (sidebarKey: string) => boolean;
  dismiss: (id: string) => void;
  dismissAll: () => Promise<void>;
  getFeature: (sidebarKey: string) => FeatureEntry | undefined;
}

export const FeatureDropVueContextKey: InjectionKey<FeatureDropVueContextValue> =
  Symbol("FeatureDropVueContext");
