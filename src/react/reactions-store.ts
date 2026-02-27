export type ReactionCounts = Record<string, number>;

const COUNTS_STORAGE_KEY = "featuredrop:reactions:counts";
const USER_STORAGE_KEY = "featuredrop:reactions:user";

export const DEFAULT_REACTIONS = ["👍", "❤️", "🎉", "👀", "👎"] as const;

function readStorageValue(key: string): string | null {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (storageKey: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (storageKey: string, storageValue: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(key, value);
  } catch {
    // noop
  }
}

function readCountsState(): Record<string, ReactionCounts> {
  const raw = readStorageValue(COUNTS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, ReactionCounts>;
  } catch {
    return {};
  }
}

function writeCountsState(state: Record<string, ReactionCounts>): void {
  writeStorageValue(COUNTS_STORAGE_KEY, JSON.stringify(state));
}

function readUserState(): Record<string, string> {
  const raw = readStorageValue(USER_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeUserState(state: Record<string, string>): void {
  writeStorageValue(USER_STORAGE_KEY, JSON.stringify(state));
}

export function getReactionCounts(entryId: string, reactions: readonly string[]): ReactionCounts {
  const state = readCountsState();
  const stored = state[entryId] ?? {};
  const counts: ReactionCounts = {};
  for (const reaction of reactions) {
    const value = stored[reaction];
    counts[reaction] = Number.isFinite(value) && value > 0 ? value : 0;
  }
  return counts;
}

export function getUserReaction(entryId: string): string | null {
  const state = readUserState();
  const reaction = state[entryId];
  return typeof reaction === "string" && reaction ? reaction : null;
}

export function reactToEntry(
  entryId: string,
  reaction: string,
  reactions: readonly string[],
): { updated: boolean; counts: ReactionCounts; userReaction: string | null } {
  if (!entryId || !reaction || !reactions.includes(reaction)) {
    return {
      updated: false,
      counts: getReactionCounts(entryId, reactions),
      userReaction: getUserReaction(entryId),
    };
  }

  const userState = readUserState();
  const currentReaction = userState[entryId];
  if (currentReaction) {
    return {
      updated: false,
      counts: getReactionCounts(entryId, reactions),
      userReaction: currentReaction,
    };
  }

  const countsState = readCountsState();
  const entryCounts: ReactionCounts = {
    ...(countsState[entryId] ?? {}),
  };
  entryCounts[reaction] = (entryCounts[reaction] ?? 0) + 1;
  countsState[entryId] = entryCounts;
  writeCountsState(countsState);

  userState[entryId] = reaction;
  writeUserState(userState);

  return {
    updated: true,
    counts: getReactionCounts(entryId, reactions),
    userReaction: reaction,
  };
}
