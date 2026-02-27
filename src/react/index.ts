// Provider
export { FeatureDropProvider } from "./provider";
export type { FeatureDropProviderProps } from "./provider";
export { ThemeProvider } from "./components/theme-provider";
export type { ThemeProviderProps } from "./components/theme-provider";

// Context
export { FeatureDropContext } from "./context";
export type { FeatureDropContextValue } from "./context";

// Hooks
export { useFeatureDrop } from "./hooks/use-feature-drop";
export { useNewFeature } from "./hooks/use-new-feature";
export type { UseNewFeatureResult } from "./hooks/use-new-feature";
export { useNewCount } from "./hooks/use-new-count";
export { useTabNotification } from "./hooks/use-tab-notification";
export type { UseTabNotificationOptions } from "./hooks/use-tab-notification";
export { useAdoptionAnalytics } from "./hooks/use-adoption-analytics";
export { useTour } from "./hooks/use-tour";
export type { UseTourResult } from "./hooks/use-tour";
export { useTourSequencer } from "./hooks/use-tour-sequencer";
export type { TourSequenceItem, UseTourSequencerResult } from "./hooks/use-tour-sequencer";
export { useChecklist } from "./hooks/use-checklist";
export type { UseChecklistResult } from "./hooks/use-checklist";
export { useSurvey } from "./hooks/use-survey";
export type { UseSurveyResult } from "./hooks/use-survey";

// Components
export { NewBadge } from "./components/new-badge";
export type { NewBadgeProps, NewBadgeRenderProps } from "./components/new-badge";

export { ChangelogWidget } from "./components/changelog-widget";
export type {
  ChangelogWidgetProps,
  ChangelogWidgetRenderProps,
  ChangelogEntryRenderProps,
} from "./components/changelog-widget";

export { Spotlight } from "./components/spotlight";
export type { SpotlightProps, SpotlightRenderProps } from "./components/spotlight";

export { Banner } from "./components/banner";
export type { BannerProps, BannerRenderProps, BannerVariant } from "./components/banner";

export { Toast } from "./components/toast";
export type { ToastProps, ToastRenderProps } from "./components/toast";

export { ChangelogPage } from "./components/changelog-page";
export type { ChangelogPageProps, PaginationMode } from "./components/changelog-page";

export { Tour } from "./components/tour";
export type { TourProps, TourStep, TourRenderProps } from "./components/tour";
export { Checklist } from "./components/checklist";
export type { ChecklistProps, ChecklistTask, ChecklistRenderProps } from "./components/checklist";
export { Hotspot, TooltipGroup } from "./components/hotspot";
export type { HotspotProps, TooltipGroupProps } from "./components/hotspot";
export { FeedbackWidget } from "./components/feedback-widget";
export type {
  FeedbackWidgetProps,
  FeedbackWidgetRenderProps,
  FeedbackPayload,
  FeedbackEmoji,
  FeedbackRateLimit,
} from "./components/feedback-widget";
export { AnnouncementModal } from "./components/announcement-modal";
export type {
  AnnouncementModalProps,
  AnnouncementModalRenderProps,
  AnnouncementSlide,
} from "./components/announcement-modal";
export { SpotlightChain } from "./components/spotlight-chain";
export type {
  SpotlightChainProps,
  SpotlightChainRenderProps,
  SpotlightChainStep,
} from "./components/spotlight-chain";
export { Survey } from "./components/survey";
export type {
  SurveyProps,
  SurveyType,
  SurveyQuestion,
  SurveyQuestionType,
  SurveyTriggerRules,
  SurveyPayload,
  SurveyRenderProps,
} from "./components/survey";
export { FeatureRequestButton } from "./components/feature-request-button";
export type {
  FeatureRequestButtonProps,
  FeatureRequestButtonRenderProps,
} from "./components/feature-request-button";
export { FeatureRequestForm } from "./components/feature-request-form";
export type {
  FeatureRequestFormProps,
  FeatureRequestFormRenderProps,
  FeatureRequestPayload,
} from "./components/feature-request-form";
