// Hooks-only barrel export — no components, no UI
// Import from 'featuredrop/react/hooks' for headless usage

// Core context hook
export { useFeatureDrop } from "./use-feature-drop";

// Feature state hooks
export { useNewFeature } from "./use-new-feature";
export type { UseNewFeatureResult } from "./use-new-feature";
export { useNewCount } from "./use-new-count";

// Tab notification
export { useTabNotification } from "./use-tab-notification";
export type { UseTabNotificationOptions } from "./use-tab-notification";

// Analytics
export { useAdoptionAnalytics } from "./use-adoption-analytics";

// Tour hooks
export { useTour } from "./use-tour";
export type { UseTourResult } from "./use-tour";
export { useTourSequencer } from "./use-tour-sequencer";
export type { TourSequenceItem, UseTourSequencerResult } from "./use-tour-sequencer";

// Checklist hook
export { useChecklist } from "./use-checklist";
export type { UseChecklistResult } from "./use-checklist";

// Survey hook
export { useSurvey } from "./use-survey";
export type { UseSurveyResult } from "./use-survey";

// Headless changelog hook
export { useChangelog } from "./use-changelog";
export type { UseChangelogResult } from "./use-changelog";

// Engine-powered hooks (require AdoptionEngine)
export { useSmartFeature } from "./use-smart-feature";
export type { UseSmartFeatureResult } from "./use-smart-feature";
export { useAdoptionScore } from "./use-adoption-score";
export type { UseAdoptionScoreResult } from "./use-adoption-score";
export { useBehaviorProfile } from "./use-behavior-profile";
export type { UseBehaviorProfileResult } from "./use-behavior-profile";
