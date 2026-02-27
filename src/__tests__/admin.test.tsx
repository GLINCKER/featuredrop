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
    expect(screen.getByText(/JSON/)).toBeDefined();
  });

  it("ManifestEditor applies schema validation before save", async () => {
    const schema = {
      safeParse: (value: unknown) => ({
        success: false,
        error: `schema rejected ${Array.isArray(value) ? "array" : "value"}`,
      }),
    };
    render(<ManifestEditor features={FEATURES} onSave={vi.fn()} schema={schema} />);
    expect(screen.getByText("schema rejected array")).toBeDefined();
    const saveButton = screen.getByText("Save") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it("ScheduleCalendar calls onSchedule/onExpire with iso timestamp", async () => {
    const onSchedule = vi.fn();
    const onExpire = vi.fn();
    render(
      <ScheduleCalendar
        features={FEATURES}
        onSchedule={onSchedule}
        onExpire={onExpire}
        minDate="2026-02-01T00:00:00Z"
      />,
    );
    fireEvent.change(screen.getByLabelText("Publish at"), {
      target: { value: "2026-03-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Expire at"), {
      target: { value: "2026-03-20T18:45" },
    });
    await userEvent.click(screen.getByText("Schedule"));
    await userEvent.click(screen.getByText("Set expiry"));
    expect(onSchedule).toHaveBeenCalledWith(
      "ai-journal",
      expect.stringMatching(/^2026-03-01T\d{2}:30:00\.000Z$/),
    );
    expect(onExpire).toHaveBeenCalledWith(
      "ai-journal",
      expect.stringMatching(/^2026-03-20T\d{2}:45:00\.000Z$/),
    );
    const publishInput = screen.getByLabelText("Publish at") as HTMLInputElement;
    expect(publishInput.getAttribute("min")).toBe("2026-02-01T00:00");
  });

  it("PreviewPanel renders selected component chips and theme marker", () => {
    const { container } = render(
      <PreviewPanel feature={FEATURES[0]} components={["badge", "toast"]} theme="dark" />,
    );
    expect(screen.getByText("AI Journal")).toBeDefined();
    expect(screen.getByText("badge")).toBeDefined();
    expect(screen.getByText("toast")).toBeDefined();
    const panel = container.querySelector("[data-featuredrop-admin-preview-panel]");
    expect(panel?.getAttribute("data-featuredrop-theme")).toBe("dark");
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
