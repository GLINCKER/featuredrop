import { describe, expect, it } from "vitest";
import { MemoryAdapter } from "../adapters/memory";
import { createFeatureDropStore, createNewCountStore, createNewFeatureStore } from "../svelte";
import type { FeatureManifest } from "../types";

const manifest: FeatureManifest = [
  {
    id: "ai-journal",
    label: "AI Journal",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    sidebarKey: "/journal",
  },
];

describe("svelte store bindings", () => {
  it("exposes new count and feature state", () => {
    const storage = new MemoryAdapter();
    const store = createFeatureDropStore({ manifest, storage });

    let snapshotCount = 0;
    const unsub = store.subscribe((state) => {
      snapshotCount = state.newCount;
    });

    expect(snapshotCount).toBe(1);
    unsub();
  });

  it("derived stores update after dismiss", () => {
    const storage = new MemoryAdapter();
    const store = createFeatureDropStore({ manifest, storage });
    const countStore = createNewCountStore(store);
    const featureStore = createNewFeatureStore(store, "/journal");

    let countValue = -1;
    let isNew = false;

    const unsub1 = countStore.subscribe((count) => {
      countValue = count;
    });
    const unsub2 = featureStore.subscribe((value) => {
      isNew = value.isNew;
    });

    expect(countValue).toBe(1);
    expect(isNew).toBe(true);

    store.dismiss("ai-journal");
    expect(countValue).toBe(0);
    expect(isNew).toBe(false);

    unsub1();
    unsub2();
  });
});
