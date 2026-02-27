import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryAdapter } from "../adapters/memory";
import { ChangelogWidget, FeatureDropProvider } from "../react";
import type { FeatureManifest } from "../types";

const MANIFEST: FeatureManifest = [
  {
    id: "journal",
    label: "Decision Journal",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
  },
];

describe("component error boundaries", () => {
  it("catches component render errors and reports through provider onError", () => {
    const onError = vi.fn();
    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()} onError={onError}>
        <ChangelogWidget>
          {() => {
            throw new Error("render boom");
          }}
        </ChangelogWidget>
      </FeatureDropProvider>,
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ component: "ChangelogWidget" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
