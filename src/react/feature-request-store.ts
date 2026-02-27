export interface FeatureRequestRecord {
  id: string;
  featureId?: string;
  title: string;
  description?: string;
  category?: string;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export type FeatureRequestSort = "votes" | "recent";

const REQUESTS_KEY = "featuredrop:feature-requests:requests";
const VOTED_KEYS = "featuredrop:feature-requests:voted";

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

function readRequests(): FeatureRequestRecord[] {
  const raw = readStorageValue(REQUESTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((request): request is FeatureRequestRecord => (
      request &&
      typeof request === "object" &&
      typeof (request as FeatureRequestRecord).id === "string" &&
      typeof (request as FeatureRequestRecord).title === "string"
    ));
  } catch {
    return [];
  }
}

function writeRequests(requests: FeatureRequestRecord[]): void {
  writeStorageValue(REQUESTS_KEY, JSON.stringify(requests));
}

function readVotedKeys(): Set<string> {
  const raw = readStorageValue(VOTED_KEYS);
  if (!raw) return new Set<string>();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeVotedKeys(keys: ReadonlySet<string>): void {
  writeStorageValue(VOTED_KEYS, JSON.stringify(Array.from(keys)));
}

function makeVoteKey(options: { requestId?: string; featureId?: string }): string | null {
  if (options.requestId) return `request:${options.requestId}`;
  if (options.featureId) return `feature:${options.featureId}`;
  return null;
}

function createId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listFeatureRequests(sortBy: FeatureRequestSort = "votes"): FeatureRequestRecord[] {
  const requests = readRequests();
  const sorted = [...requests].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (b.votes !== a.votes) return b.votes - a.votes;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return sorted;
}

export function hasUserVoted(options: { requestId?: string; featureId?: string }): boolean {
  const voteKey = makeVoteKey(options);
  if (!voteKey) return false;
  return readVotedKeys().has(voteKey);
}

export function createFeatureRequest(input: {
  title: string;
  description?: string;
  category?: string;
  featureId?: string;
  autoVote?: boolean;
}): FeatureRequestRecord {
  const now = new Date().toISOString();
  const request: FeatureRequestRecord = {
    id: createId(),
    featureId: input.featureId,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    category: input.category || undefined,
    votes: input.autoVote ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  };

  const requests = readRequests();
  requests.push(request);
  writeRequests(requests);

  if (input.autoVote) {
    const voted = readVotedKeys();
    voted.add(`request:${request.id}`);
    writeVotedKeys(voted);
  }

  return request;
}

export function voteFeatureRequest(input: {
  requestId?: string;
  featureId?: string;
  defaultTitle?: string;
}): { voted: boolean; request: FeatureRequestRecord } | null {
  const voteKey = makeVoteKey({ requestId: input.requestId, featureId: input.featureId });
  if (!voteKey) return null;

  const voted = readVotedKeys();
  const requests = readRequests();
  let request = input.requestId
    ? requests.find((item) => item.id === input.requestId)
    : requests.find((item) => item.featureId === input.featureId);

  if (!request) {
    const now = new Date().toISOString();
    request = {
      id: createId(),
      featureId: input.featureId,
      title: input.defaultTitle?.trim() || input.featureId || "Feature request",
      votes: 0,
      createdAt: now,
      updatedAt: now,
    };
    requests.push(request);
  }

  if (voted.has(voteKey)) {
    return { voted: false, request };
  }

  request.votes += 1;
  request.updatedAt = new Date().toISOString();
  writeRequests(requests);

  voted.add(voteKey);
  writeVotedKeys(voted);
  return { voted: true, request };
}
