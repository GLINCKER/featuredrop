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
import { withFeatureDropBoundary } from "./error-boundary";
import { NewBadge as NewBadgeBase } from "./components/new-badge";
export type { NewBadgeProps, NewBadgeRenderProps } from "./components/new-badge";
export const NewBadge = withFeatureDropBoundary(NewBadgeBase, "NewBadge");

import { ChangelogWidget as ChangelogWidgetBase } from "./components/changelog-widget";
export type {
  ChangelogWidgetProps,
  ChangelogWidgetRenderProps,
  ChangelogEntryRenderProps,
} from "./components/changelog-widget";
export const ChangelogWidget = withFeatureDropBoundary(ChangelogWidgetBase, "ChangelogWidget");

import { Spotlight as SpotlightBase } from "./components/spotlight";
export type { SpotlightProps, SpotlightRenderProps } from "./components/spotlight";
export const Spotlight = withFeatureDropBoundary(SpotlightBase, "Spotlight");

import { Banner as BannerBase } from "./components/banner";
export type { BannerProps, BannerRenderProps, BannerVariant } from "./components/banner";
export const Banner = withFeatureDropBoundary(BannerBase, "Banner");

import { Toast as ToastBase } from "./components/toast";
export type { ToastProps, ToastRenderProps } from "./components/toast";
export const Toast = withFeatureDropBoundary(ToastBase, "Toast");

import { ChangelogPage as ChangelogPageBase } from "./components/changelog-page";
export type { ChangelogPageProps, PaginationMode } from "./components/changelog-page";
export const ChangelogPage = withFeatureDropBoundary(ChangelogPageBase, "ChangelogPage");

import { Tour as TourBase } from "./components/tour";
export type { TourProps, TourStep, TourRenderProps } from "./components/tour";
export const Tour = withFeatureDropBoundary(TourBase, "Tour");
import { Checklist as ChecklistBase } from "./components/checklist";
export type { ChecklistProps, ChecklistTask, ChecklistRenderProps } from "./components/checklist";
export const Checklist = withFeatureDropBoundary(ChecklistBase, "Checklist");
import { Hotspot as HotspotBase, TooltipGroup as TooltipGroupBase } from "./components/hotspot";
export type { HotspotProps, TooltipGroupProps } from "./components/hotspot";
export const Hotspot = withFeatureDropBoundary(HotspotBase, "Hotspot");
export const TooltipGroup = withFeatureDropBoundary(TooltipGroupBase, "TooltipGroup");
import { FeedbackWidget as FeedbackWidgetBase } from "./components/feedback-widget";
export type {
  FeedbackWidgetProps,
  FeedbackWidgetRenderProps,
  FeedbackPayload,
  FeedbackEmoji,
  FeedbackRateLimit,
} from "./components/feedback-widget";
export const FeedbackWidget = withFeatureDropBoundary(FeedbackWidgetBase, "FeedbackWidget");
import { AnnouncementModal as AnnouncementModalBase } from "./components/announcement-modal";
export type {
  AnnouncementModalProps,
  AnnouncementModalRenderProps,
  AnnouncementSlide,
} from "./components/announcement-modal";
export const AnnouncementModal = withFeatureDropBoundary(AnnouncementModalBase, "AnnouncementModal");
import { SpotlightChain as SpotlightChainBase } from "./components/spotlight-chain";
export type {
  SpotlightChainProps,
  SpotlightChainRenderProps,
  SpotlightChainStep,
} from "./components/spotlight-chain";
export const SpotlightChain = withFeatureDropBoundary(SpotlightChainBase, "SpotlightChain");
import { Survey as SurveyBase } from "./components/survey";
export type {
  SurveyProps,
  SurveyType,
  SurveyQuestion,
  SurveyQuestionType,
  SurveyTriggerRules,
  SurveyPayload,
  SurveyRenderProps,
} from "./components/survey";
export const Survey = withFeatureDropBoundary(SurveyBase, "Survey");
import { FeatureRequestButton as FeatureRequestButtonBase } from "./components/feature-request-button";
export type {
  FeatureRequestButtonProps,
  FeatureRequestButtonRenderProps,
} from "./components/feature-request-button";
export const FeatureRequestButton = withFeatureDropBoundary(FeatureRequestButtonBase, "FeatureRequestButton");
import { FeatureRequestForm as FeatureRequestFormBase } from "./components/feature-request-form";
export type {
  FeatureRequestFormProps,
  FeatureRequestFormRenderProps,
  FeatureRequestPayload,
} from "./components/feature-request-form";
export const FeatureRequestForm = withFeatureDropBoundary(FeatureRequestFormBase, "FeatureRequestForm");
