import type { StorageAdapter } from "../types";

export interface LocalStorageAdapterOptions {
  /** Key prefix for localStorage entries. Default: "featuredrop" */
  prefix?: string;
  /** Server-side watermark (ISO string). Typically from user profile. */
  watermark?: string | null;
  /** Callback when dismissAll is called. Use for server-side watermark updates. */
  onDismissAll?: (now: Date) => Promise<void>;
}

const DISMISSED_SUFFIX = ":dismissed";

/**
 * localStorage-based storage adapter.
 *
 * Architecture:
 * - **Watermark** comes from the server (passed at construction time)
 * - **Per-feature dismissals** are stored in localStorage (zero server writes)
 * - **dismissAll()** optionally calls a server callback, then clears localStorage
 *
 * Gracefully handles SSR environments where `window`/`localStorage` is unavailable.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly watermarkValue: string | null;
  private readonly onDismissAllCallback?: (now: Date) => Promise<void>;
  private readonly dismissedKey: string;

  constructor(options: LocalStorageAdapterOptions = {}) {
    this.prefix = options.prefix ?? "featuredrop";
    this.watermarkValue = options.watermark ?? null;
    this.onDismissAllCallback = options.onDismissAll;
    this.dismissedKey = `${this.prefix}${DISMISSED_SUFFIX}`;
  }

  getWatermark(): string | null {
    return this.watermarkValue;
  }

  getDismissedIds(): ReadonlySet<string> {
    try {
      if (typeof window === "undefined") return new Set();
      const raw = localStorage.getItem(this.dismissedKey);
      if (!raw) return new Set();
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed as string[]);
      return new Set();
    } catch {
      return new Set();
    }
  }

  dismiss(id: string): void {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(this.dismissedKey);
      const existing: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      if (!existing.includes(id)) {
        existing.push(id);
        localStorage.setItem(this.dismissedKey, JSON.stringify(existing));
      }
    } catch {
      // localStorage unavailable — silent fail
    }
  }

  async dismissAll(now: Date): Promise<void> {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(this.dismissedKey);
      }
    } catch {
      // localStorage unavailable — silent fail
    }

    if (this.onDismissAllCallback) {
      await this.onDismissAllCallback(now);
    }
  }
}
