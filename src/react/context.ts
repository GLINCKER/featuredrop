import { createContext } from "react";
import type { FeatureEntry } from "../types";

export interface FeatureDropContextValue {
  /** All currently "new" features */
  newFeatures: FeatureEntry[];
  /** Count of new features */
  newCount: number;
  /** All new features sorted by priority then release date */
  newFeaturesSorted: FeatureEntry[];
  /** Check if a sidebar key has any new features */
  isNew: (sidebarKey: string) => boolean;
  /** Dismiss a single feature by ID */
  dismiss: (id: string) => void;
  /** Dismiss all features (marks all as seen) */
  dismissAll: () => Promise<void>;
  /** Get the feature entry for a sidebar key (if it's new) */
  getFeature: (sidebarKey: string) => FeatureEntry | undefined;
}

export const FeatureDropContext = createContext<FeatureDropContextValue | null>(
  null,
);
