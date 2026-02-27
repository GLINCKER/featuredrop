import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FeatureManifest } from "../types";
import { MemoryAdapter } from "../adapters/memory";
import { FeatureDropProvider } from "../react/provider";
import { Tour } from "../react/components/tour";
import { useTourSequencer } from "../react/hooks/use-tour-sequencer";
import { useFeatureDrop } from "../react/hooks/use-feature-drop";

const MANIFEST: FeatureManifest = [
  {
    id: "base-feature",
    label: "Base",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
  },
  {
    id: "dependent-feature",
    label: "Dependent",
    releasedAt: "2026-02-21T00:00:00Z",
    showNewUntil: "2026-03-21T00:00:00Z",
    dependsOn: { clicked: ["base-feature"] },
  },
];

function SequencerHarness() {
  const { nextTourId, nextFeatureId, remainingTours, startNextTour } = useTourSequencer([
    { featureId: "base-feature", tourId: "tour-base" },
    { featureId: "dependent-feature", tourId: "tour-dependent" },
  ]);
  const { markFeatureClicked } = useFeatureDrop();

  return (
    <div>
      <span data-testid="next-tour">{nextTourId ?? "none"}</span>
      <span data-testid="next-feature">{nextFeatureId ?? "none"}</span>
      <span data-testid="remaining">{remainingTours}</span>
      <button onClick={startNextTour}>start-next</button>
      <button onClick={() => markFeatureClicked("base-feature")}>mark-clicked</button>
    </div>
  );
}

describe("useTourSequencer", () => {
  it("starts tours in sequence and unlocks dependent tours after interactions", async () => {
    render(
      <FeatureDropProvider manifest={MANIFEST} storage={new MemoryAdapter()}>
        <div id="target-base">Base target</div>
        <div id="target-dependent">Dependent target</div>
        <SequencerHarness />
        <Tour
          id="tour-base"
          persistence={false}
          steps={[
            {
              id: "base-step",
              target: "#target-base",
              title: "Base Tour",
              content: "Base content",
            },
          ]}
        />
        <Tour
          id="tour-dependent"
          persistence={false}
          steps={[
            {
              id: "dependent-step",
              target: "#target-dependent",
              title: "Dependent Tour",
              content: "Dependent content",
            },
          ]}
        />
      </FeatureDropProvider>,
    );

    expect(screen.getByTestId("next-tour").textContent).toBe("tour-base");
    expect(screen.getByTestId("remaining").textContent).toBe("1");

    await userEvent.click(screen.getByText("start-next"));
    await waitFor(() => {
      expect(screen.getByText("Base Tour")).toBeDefined();
    });
    await userEvent.click(screen.getByText("Finish"));

    await userEvent.click(screen.getByText("mark-clicked"));
    await waitFor(() => {
      expect(screen.getByTestId("next-tour").textContent).toBe("tour-dependent");
      expect(screen.getByTestId("next-feature").textContent).toBe("dependent-feature");
      expect(screen.getByTestId("remaining").textContent).toBe("1");
    });

    await userEvent.click(screen.getByText("start-next"));
    await waitFor(() => {
      expect(screen.getByText("Dependent Tour")).toBeDefined();
    });
  });
});
