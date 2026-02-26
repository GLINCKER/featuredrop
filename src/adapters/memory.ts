import type { StorageAdapter } from "../types";

/**
 * In-memory storage adapter.
 *
 * Useful for:
 * - Testing (no side effects)
 * - Server-side rendering (no `window`/`localStorage`)
 * - Environments without persistent storage
 */
export class MemoryAdapter implements StorageAdapter {
  private watermark: string | null;
  private dismissed: Set<string>;

  constructor(options: { watermark?: string | null } = {}) {
    this.watermark = options.watermark ?? null;
    this.dismissed = new Set();
  }

  getWatermark(): string | null {
    return this.watermark;
  }

  getDismissedIds(): ReadonlySet<string> {
    return this.dismissed;
  }

  dismiss(id: string): void {
    this.dismissed.add(id);
  }

  async dismissAll(now: Date): Promise<void> {
    this.watermark = now.toISOString();
    this.dismissed.clear();
  }
}
