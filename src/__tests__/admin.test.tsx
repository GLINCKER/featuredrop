import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AudienceBuilder,
  ManifestEditor,
  PreviewPanel,
  ScheduleCalendar,
} from "../admin";
import type { FeatureEntry } from "../types";

const FEATURES: FeatureEntry[] = [
  {
    id: "ai-journal",
    label: "AI Journal",
    description: "Track decisions with AI.",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
  },
];

describe("admin components", () => {
  it("ManifestEditor parses JSON draft and triggers onSave", async () => {
    const onSave = vi.fn();
    render(<ManifestEditor features={FEATURES} onSave={onSave} />);
    await userEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByText("saved")).toBeDefined();
  });

  it("ManifestEditor shows invalid state for malformed json", async () => {
    render(<ManifestEditor features={FEATURES} onSave={vi.fn()} />);
    const editor = screen.getByLabelText("Manifest JSON");
    fireEvent.change(editor, { target: { value: "{ not-json" } });
    expect(screen.getByText("Invalid JSON")).toBeDefined();
  });

  it("ScheduleCalendar calls onSchedule with iso timestamp", async () => {
    const onSchedule = vi.fn();
    render(<ScheduleCalendar features={FEATURES} onSchedule={onSchedule} />);
    fireEvent.change(screen.getByLabelText("Publish at"), {
      target: { value: "2026-03-01T09:30" },
    });
    await userEvent.click(screen.getByText("Schedule"));
    expect(onSchedule).toHaveBeenCalledWith(
      "ai-journal",
      expect.stringMatching(/^2026-03-01T\d{2}:30:00\.000Z$/),
    );
  });

  it("PreviewPanel renders selected component chips", () => {
    render(<PreviewPanel feature={FEATURES[0]} components={["badge", "toast"]} />);
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.getByText("badge")).toBeDefined();
    expect(screen.getByText("toast")).toBeDefined();
  });

  it("AudienceBuilder toggles selections and saves audience", async () => {
    const onSave = vi.fn();
    const onChange = vi.fn();
    render(
      <AudienceBuilder
        segments={["free", "pro"]}
        roles={["admin", "viewer"]}
        regions={["us", "eu"]}
        onChange={onChange}
        onSave={onSave}
      />,
    );

    await userEvent.click(screen.getByLabelText("pro"));
    await userEvent.click(screen.getByLabelText("admin"));
    await userEvent.click(screen.getByLabelText("eu"));
    await userEvent.click(screen.getByText("Save audience"));

    expect(onChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith({
      plan: ["pro"],
      role: ["admin"],
      region: ["eu"],
    });
  });
});
