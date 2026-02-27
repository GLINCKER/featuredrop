import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { MemoryAdapter } from "../adapters";
import { createManifest } from "../helpers";
import { createFeatureDropStore, useFeatureDrop } from "../solid";

describe("solid adapter", () => {
  it("creates a store with signal accessors and adapter actions", () => {
    createRoot((dispose) => {
      const manifest = createManifest([
        {
          id: "ai-journal",
          label: "AI Journal",
          releasedAt: "2026-02-20T00:00:00Z",
          showNewUntil: "2026-03-20T00:00:00Z",
          sidebarKey: "journal",
        },
      ]);
      const storage = new MemoryAdapter();
      const store = createFeatureDropStore({ manifest, storage });

      expect(store.newCount()).toBe(1);
      expect(store.isNew("journal")).toBe(true);

      store.dismiss("ai-journal");
      expect(store.newCount()).toBe(0);

      void store.dismissAll();
      expect(store.newCount()).toBe(0);

      dispose();
    });
  });

  it("exports hooks", () => {
    expect(typeof useFeatureDrop).toBe("function");
  });
});
