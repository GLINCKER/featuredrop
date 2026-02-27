import type { FeatureFlagBridge, UserContext } from "./types";

export interface CreateFlagBridgeOptions {
  isEnabled: (flagKey: string, userContext?: UserContext) => boolean;
  defaultValue?: boolean;
  onError?: (error: unknown, context: { bridge: "custom"; flagKey: string }) => void;
}

export function createFlagBridge(options: CreateFlagBridgeOptions): FeatureFlagBridge {
  return {
    isEnabled: (flagKey: string, userContext?: UserContext) => {
      const fallback = options.defaultValue ?? false;
      if (!flagKey) return fallback;
      try {
        return options.isEnabled(flagKey, userContext);
      } catch (error: unknown) {
        options.onError?.(error, { bridge: "custom", flagKey });
        return fallback;
      }
    },
  };
}

export interface LaunchDarklyClientLike {
  variation: (flagKey: string, user: Record<string, unknown>, defaultValue: boolean) => boolean;
}

export interface LaunchDarklyBridgeOptions {
  userResolver?: (userContext?: UserContext) => Record<string, unknown>;
  defaultValue?: boolean;
  onError?: (error: unknown, context: { bridge: "launchdarkly"; flagKey: string }) => void;
}

export class LaunchDarklyBridge implements FeatureFlagBridge {
  private readonly client: LaunchDarklyClientLike;
  private readonly options: LaunchDarklyBridgeOptions;

  constructor(client: LaunchDarklyClientLike, options: LaunchDarklyBridgeOptions = {}) {
    this.client = client;
    this.options = options;
  }

  isEnabled(flagKey: string, userContext?: UserContext): boolean {
    const fallback = this.options.defaultValue ?? false;
    if (!flagKey) return fallback;
    const defaultUser = {
      key: userContext?.traits?.id ?? userContext?.role ?? "anonymous",
      custom: {
        plan: userContext?.plan,
        role: userContext?.role,
        region: userContext?.region,
        ...(userContext?.traits ?? {}),
      },
    };
    try {
      const user = this.options.userResolver ? this.options.userResolver(userContext) : defaultUser;
      return this.client.variation(flagKey, user, fallback);
    } catch (error: unknown) {
      this.options.onError?.(error, { bridge: "launchdarkly", flagKey });
      return fallback;
    }
  }
}

export interface PostHogClientLike {
  isFeatureEnabled: (
    flagKey: string,
    distinctId?: string,
    groups?: Record<string, string>,
    personProperties?: Record<string, unknown>,
  ) => boolean;
}

export interface PostHogBridgeOptions {
  distinctIdResolver?: (userContext?: UserContext) => string | undefined;
  groupsResolver?: (userContext?: UserContext) => Record<string, string> | undefined;
  defaultValue?: boolean;
  onError?: (error: unknown, context: { bridge: "posthog"; flagKey: string }) => void;
}

export class PostHogBridge implements FeatureFlagBridge {
  private readonly client: PostHogClientLike;
  private readonly options: PostHogBridgeOptions;

  constructor(client: PostHogClientLike, options: PostHogBridgeOptions = {}) {
    this.client = client;
    this.options = options;
  }

  isEnabled(flagKey: string, userContext?: UserContext): boolean {
    const fallback = this.options.defaultValue ?? false;
    if (!flagKey) return fallback;
    try {
      const distinctId = this.options.distinctIdResolver
        ? this.options.distinctIdResolver(userContext)
        : (typeof userContext?.traits?.id === "string" ? userContext.traits.id : undefined);
      const groups = this.options.groupsResolver
        ? this.options.groupsResolver(userContext)
        : undefined;
      return this.client.isFeatureEnabled(flagKey, distinctId, groups, userContext?.traits);
    } catch (error: unknown) {
      this.options.onError?.(error, { bridge: "posthog", flagKey });
      return fallback;
    }
  }
}
