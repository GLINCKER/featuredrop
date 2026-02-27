import { createContext } from "react";
import type { FeatureEntry, FeaturePriority } from "../types";
import type { AdoptionEventInput } from "../analytics";
import type { FeatureDropTranslations } from "../i18n";

export interface FeatureDropContextValue {
  /** Full manifest provided to the provider */
  manifest: FeatureEntry[] | readonly FeatureEntry[];
  /** All currently "new" features */
  newFeatures: FeatureEntry[];
  /** New features currently queued by throttling rules */
  queuedFeatures: FeatureEntry[];
  /** Count of new features */
  newCount: number;
  /** Count before throttling (all pending new features) */
  totalNewCount: number;
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
  /** Whether quiet mode (Do Not Disturb) is enabled */
  quietMode: boolean;
  /** Enable/disable quiet mode */
  setQuietMode: (enabled: boolean) => void;
  /** Mark a feature as seen for dependency-chain resolution */
  markFeatureSeen: (featureId: string) => void;
  /** Mark a feature as clicked for dependency-chain resolution */
  markFeatureClicked: (featureId: string) => void;
  /** Remaining toasts allowed in this session under throttle rules */
  getRemainingToastSlots: () => number;
  /** Mark toasts as shown in this session */
  markToastsShown: (featureIds: string[]) => void;
  /** Whether a modal can open right now under throttle rules */
  canShowModal: (priority?: FeaturePriority) => boolean;
  /** Record a modal display timestamp */
  markModalShown: () => void;
  /** Whether a tour can start right now under throttle rules */
  canShowTour: () => boolean;
  /** Record a tour start timestamp */
  markTourShown: () => void;
  /** Acquire/release spotlight slots under maxSimultaneousSpotlights */
  acquireSpotlightSlot: (id: string, priority?: FeaturePriority) => boolean;
  releaseSpotlightSlot: (id: string) => void;
  /** Number of currently active spotlight slots */
  activeSpotlightCount: number;
  /** Emit an adoption analytics event (collector-backed when configured) */
  trackAdoptionEvent: (event: AdoptionEventInput) => void;
  /** Active locale code used by built-in UI strings */
  locale: string;
  /** Resolved translation strings for built-in React components */
  translations: FeatureDropTranslations;
  /** Track a named usage event for trigger rules */
  trackUsageEvent: (event: string, delta?: number) => void;
  /** Track a named trigger event for trigger rules */
  trackTriggerEvent: (event: string) => void;
  /** Mark a milestone for trigger rules */
  trackMilestone: (event: string) => void;
  /** Manually override current path for page trigger rules */
  setTriggerPath: (path: string) => void;
}

export const FeatureDropContext = createContext<FeatureDropContextValue | null>(
  null,
);
