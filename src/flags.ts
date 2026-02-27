import type { FeatureFlagBridge, UserContext } from "./types";

export interface CreateFlagBridgeOptions {
  isEnabled: (flagKey: string, userContext?: UserContext) => boolean;
}

export function createFlagBridge(options: CreateFlagBridgeOptions): FeatureFlagBridge {
  return {
    isEnabled: (flagKey: string, userContext?: UserContext) => {
      if (!flagKey) return false;
      return options.isEnabled(flagKey, userContext);
    },
  };
}

export interface LaunchDarklyClientLike {
  variation: (flagKey: string, user: Record<string, unknown>, defaultValue: boolean) => boolean;
}

export interface LaunchDarklyBridgeOptions {
  userResolver?: (userContext?: UserContext) => Record<string, unknown>;
  defaultValue?: boolean;
}

export class LaunchDarklyBridge implements FeatureFlagBridge {
  private readonly client: LaunchDarklyClientLike;
  private readonly options: LaunchDarklyBridgeOptions;

  constructor(client: LaunchDarklyClientLike, options: LaunchDarklyBridgeOptions = {}) {
    this.client = client;
    this.options = options;
  }

  isEnabled(flagKey: string, userContext?: UserContext): boolean {
    const defaultUser = {
      key: userContext?.traits?.id ?? userContext?.role ?? "anonymous",
      custom: {
        plan: userContext?.plan,
        role: userContext?.role,
        region: userContext?.region,
        ...(userContext?.traits ?? {}),
      },
    };
    const user = this.options.userResolver ? this.options.userResolver(userContext) : defaultUser;
    return this.client.variation(flagKey, user, this.options.defaultValue ?? false);
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
}

export class PostHogBridge implements FeatureFlagBridge {
  private readonly client: PostHogClientLike;
  private readonly options: PostHogBridgeOptions;

  constructor(client: PostHogClientLike, options: PostHogBridgeOptions = {}) {
    this.client = client;
    this.options = options;
  }

  isEnabled(flagKey: string, userContext?: UserContext): boolean {
    const distinctId = this.options.distinctIdResolver
      ? this.options.distinctIdResolver(userContext)
      : (typeof userContext?.traits?.id === "string" ? userContext.traits.id : undefined);
    const groups = this.options.groupsResolver
      ? this.options.groupsResolver(userContext)
      : undefined;
    return this.client.isFeatureEnabled(flagKey, distinctId, groups, userContext?.traits);
  }
}
