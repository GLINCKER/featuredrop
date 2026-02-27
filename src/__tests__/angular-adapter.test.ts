import { describe, expect, it } from "vitest";
import { MemoryAdapter } from "../adapters";
import { createManifest } from "../helpers";
import { createFeatureDropService, FeatureDropService, type SignalLike } from "../angular";

function createSignal<T>(initial: T): SignalLike<T> {
  let value = initial;
  const signal = (() => value) as SignalLike<T>;
  signal.set = (next: T) => {
    value = next;
  };
  return signal;
}

describe("angular adapter", () => {
  it("creates a signal-based feature service", async () => {
    const manifest = createManifest([
      {
        id: "ai-journal",
        label: "AI Journal",
        sidebarKey: "journal",
        releasedAt: "2026-02-20T00:00:00Z",
        showNewUntil: "2099-03-20T00:00:00Z",
      },
    ]);
    const service = createFeatureDropService({
      manifest,
      storage: new MemoryAdapter(),
      createSignal,
    });

    expect(service.newCount()).toBe(1);
    service.dismiss("ai-journal");
    expect(service.newCount()).toBe(0);
    await service.dismissAll();
    expect(service.newCount()).toBe(0);
  });

  it("exposes class wrapper", () => {
    expect(typeof FeatureDropService).toBe("function");
  });
});
