// Provider
export { FeatureDropProvider } from "./provider";
export type { FeatureDropProviderProps } from "./provider";

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
