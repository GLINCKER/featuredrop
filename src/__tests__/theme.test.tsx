import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryAdapter } from "../adapters/memory";
import { FeatureDropProvider } from "../react/provider";
import { ChangelogPage } from "../react/components/changelog-page";
import { ChangelogWidget } from "../react/components/changelog-widget";
import { ThemeProvider } from "../react/components/theme-provider";
import { createTheme, resolveTheme, themeToCSSVariables } from "../theme";
import type { FeatureManifest } from "../types";

const TEST_MANIFEST: FeatureManifest = [
  {
    id: "theme-test",
    label: "Theme test",
    releasedAt: "2026-02-20T00:00:00Z",
    showNewUntil: "2026-03-20T00:00:00Z",
    sidebarKey: "/theme-test",
  },
];

function ReactWrapper({ children }: { children: React.ReactNode }) {
  return (
    <FeatureDropProvider manifest={TEST_MANIFEST} storage={new MemoryAdapter()}>
      {children}
    </FeatureDropProvider>
  );
}

describe("theme utilities", () => {
  it("createTheme merges overrides on top of light defaults", () => {
    const theme = createTheme({
      colors: { primary: "#111111" },
      spacing: { md: "18px" },
    });

    expect(theme.colors.primary).toBe("#111111");
    expect(theme.spacing.md).toBe("18px");
    expect(theme.colors.background).toBe("#ffffff");
  });

  it("resolveTheme handles presets and auto mode", () => {
    const dark = resolveTheme("dark");
    const autoDark = resolveTheme("auto", { prefersDark: true });
    const autoLight = resolveTheme("auto", { prefersDark: false });

    expect(dark.colors.background).toBe("#0b1220");
    expect(autoDark.colors.text).toBe("#f3f4f6");
    expect(autoLight.colors.background).toBe("#ffffff");
  });

  it("themeToCSSVariables exposes component token aliases", () => {
    const vars = themeToCSSVariables(
      createTheme({
        colors: { primary: "#7c3aed" },
      }),
    );

    expect(vars["--featuredrop-color-primary"]).toBe("#7c3aed");
    expect(vars["--featuredrop-cta-bg"]).toBe("#7c3aed");
    expect(vars["--featuredrop-trigger-color"]).toBe("#111827");
  });
});

describe("theme integration", () => {
  it("ThemeProvider applies CSS variables to its subtree", () => {
    const { container } = render(
      <ThemeProvider theme="dark">
        <div>child</div>
      </ThemeProvider>,
    );

    const root = container.querySelector("[data-featuredrop-theme-provider]") as HTMLElement;
    expect(root.style.getPropertyValue("--featuredrop-color-primary")).toBe("#60a5fa");
    expect(root.style.getPropertyValue("--featuredrop-widget-bg")).toBe("#0b1220");
  });

  it("ChangelogWidget supports component-scoped theme overrides", () => {
    const { container } = render(
      <ReactWrapper>
        <ChangelogWidget theme={{ colors: { primary: "#0f766e" } }} />
      </ReactWrapper>,
    );

    const root = container.querySelector("[data-featuredrop-widget]") as HTMLElement;
    expect(root.style.getPropertyValue("--featuredrop-color-primary")).toBe("#0f766e");
    expect(root.style.getPropertyValue("--featuredrop-cta-bg")).toBe("#0f766e");
  });

  it("ChangelogPage supports component-scoped theme presets", () => {
    const { container } = render(
      <ReactWrapper>
        <ChangelogPage theme="minimal" pagination="load-more" />
      </ReactWrapper>,
    );

    const root = container.querySelector("[data-featuredrop-changelog-page]") as HTMLElement;
    expect(root.style.getPropertyValue("--featuredrop-shadow-md")).toBe("none");
    expect(root.style.getPropertyValue("--featuredrop-widget-shadow")).toBe("none");
  });
});
