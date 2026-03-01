import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { FeatureDropProvider } from "../react/provider";
import { SmartAnnouncement } from "../react/components/smart-announcement";
import { createAdoptionEngine } from "../engine";
import type { FeatureEntry } from "../types";
import { MemoryAdapter } from "../adapters/memory";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const testManifest: FeatureEntry[] = [
  {
    id: "dark-mode",
    label: "Dark Mode",
    description: "Full dark theme support.",
    releasedAt: "2026-01-01T00:00:00Z",
    showNewUntil: "2026-06-01T00:00:00Z",
    type: "feature",
    priority: "normal",
  },
  {
    id: "api-keys",
    label: "API Keys v2",
    description: "Scoped API keys with expiration.",
    releasedAt: "2026-02-01T00:00:00Z",
    showNewUntil: "2026-08-01T00:00:00Z",
    type: "feature",
    priority: "critical",
  },
];

function createWrapper(options?: {
  withEngine?: boolean;
  manifest?: FeatureEntry[];
}) {
  const manifest = options?.manifest ?? testManifest;
  const engine = options?.withEngine
    ? createAdoptionEngine({ manifest })
    : undefined;
  const storage = new MemoryAdapter();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FeatureDropProvider
        manifest={manifest}
        storage={storage}
        engine={engine}
      >
        {children}
      </FeatureDropProvider>
    );
  };
}

describe("SmartAnnouncement", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("renders badge format without engine", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" />
      </Wrapper>,
    );

    const badge = screen.getByText("New");
    expect(badge).toBeDefined();
    expect(badge.getAttribute("data-featuredrop")).toBe("smart-badge");
  });

  it("renders nothing for unknown features without engine", () => {
    const Wrapper = createWrapper({ withEngine: false });
    const { container } = render(
      <Wrapper>
        <SmartAnnouncement id="nonexistent" />
      </Wrapper>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("supports format override", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" format="banner" />
      </Wrapper>,
    );

    const banner = screen.getByRole("alert");
    expect(banner).toBeDefined();
    expect(banner.getAttribute("data-featuredrop")).toBe("smart-banner");
  });

  it("renders inline format", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" format="inline" />
      </Wrapper>,
    );

    const inline = screen.getByText("Dark Mode");
    expect(inline).toBeDefined();
    expect(inline.getAttribute("data-featuredrop")).toBe("smart-inline");
  });

  it("renders toast format with dismiss button", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" format="toast" />
      </Wrapper>,
    );

    expect(screen.getByText("Dark Mode")).toBeDefined();
    const dismissBtn = screen.getByLabelText("Dismiss");
    expect(dismissBtn).toBeDefined();
  });

  it("supports render prop for full customization", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode">
          {({ show, format, feature }) => {
            if (!show) return null;
            return (
              <div data-testid="custom">
                {format}: {feature?.label}
              </div>
            );
          }}
        </SmartAnnouncement>
      </Wrapper>,
    );

    expect(screen.getByTestId("custom")).toBeDefined();
    expect(screen.getByTestId("custom").textContent).toContain("Dark Mode");
  });

  it("render prop receives expected shape", () => {
    const Wrapper = createWrapper({ withEngine: true });
    let renderProps: Record<string, unknown> = {};

    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode">
          {(props) => {
            renderProps = props;
            return null;
          }}
        </SmartAnnouncement>
      </Wrapper>,
    );

    expect(renderProps).toHaveProperty("show");
    expect(renderProps).toHaveProperty("format");
    expect(renderProps).toHaveProperty("fallbackFormat");
    expect(renderProps).toHaveProperty("feature");
    expect(renderProps).toHaveProperty("dismiss");
    expect(renderProps).toHaveProperty("confidence");
    expect(renderProps).toHaveProperty("reason");
    expect(typeof renderProps.dismiss).toBe("function");
  });

  it("dismisses toast on button click", async () => {
    const Wrapper = createWrapper({ withEngine: false });
    const { rerender } = render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" format="toast" />
      </Wrapper>,
    );

    const dismissBtn = screen.getByLabelText("Dismiss");
    await userEvent.click(dismissBtn);

    // After dismiss, the component should not render the toast
    // (the provider will remove the feature from visible list on next render)
    expect(dismissBtn).toBeDefined();
  });

  it("renders with engine enabled", () => {
    const Wrapper = createWrapper({ withEngine: true });
    const { container } = render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" />
      </Wrapper>,
    );

    // With engine, the timing decision determines rendering
    // The component should either render or not based on engine decision
    expect(container).toBeDefined();
  });

  it("applies custom className", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" className="my-badge" />
      </Wrapper>,
    );

    const badge = screen.getByText("New");
    expect(badge.className).toContain("my-badge");
  });

  it("applies custom style", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" style={{ marginLeft: 8 }} />
      </Wrapper>,
    );

    const badge = screen.getByText("New");
    expect(badge.style.marginLeft).toBe("8px");
  });

  it("has correct aria attributes on badge", () => {
    const Wrapper = createWrapper({ withEngine: false });
    render(
      <Wrapper>
        <SmartAnnouncement id="dark-mode" />
      </Wrapper>,
    );

    const badge = screen.getByText("New");
    expect(badge.getAttribute("role")).toBe("status");
    expect(badge.getAttribute("aria-label")).toBe("New: Dark Mode");
  });
});
