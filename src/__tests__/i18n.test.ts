import { describe, expect, it } from "vitest";
import {
  formatDateForLocale,
  formatRelativeTimeForLocale,
  getLocaleDirection,
  resolveLocale,
  resolveTranslations,
} from "../i18n";

describe("resolveTranslations", () => {
  it("returns english defaults when locale is omitted", () => {
    const t = resolveTranslations();
    expect(t.whatsNewTitle).toBe("What's New");
    expect(t.loadMore).toBe("Load more");
    expect(t.newFeatureCount(2)).toBe("2 new features");
  });

  it("resolves locale dictionaries with locale-aware formatters", () => {
    const t = resolveTranslations("fr");
    expect(t.whatsNewTitle).toBe("Nouveautés");
    expect(t.markAllRead).toBe("Tout marquer comme lu");
    expect(t.stepOf(2, 5)).toBe("Etape 2 sur 5");
    expect(t.newFeatureCount(0)).toBe("Aucune nouveaute");
  });

  it("applies custom overrides over locale defaults", () => {
    const t = resolveTranslations("es", {
      submit: "Enviar ahora",
    });
    expect(t.submit).toBe("Enviar ahora");
    expect(t.close).toBe("Cerrar");
  });

  it("normalizes locale aliases and detects rtl direction", () => {
    expect(resolveLocale("ES-MX")).toBe("es");
    expect(resolveLocale("zh-CN")).toBe("zh-cn");
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("fr")).toBe("ltr");
  });

  it("formats dates with locale-aware output", () => {
    expect(formatDateForLocale("2026-02-20T00:00:00Z", "en")).toContain("2026");
    expect(formatDateForLocale("2026-02-20T00:00:00Z", "ar")).toMatch(/2026|٢٠٢٦/);
  });

  it("formats relative time per locale", () => {
    const now = "2026-02-27T00:00:00Z";
    expect(formatRelativeTimeForLocale("2026-02-25T00:00:00Z", "en", { now })).toContain("ago");
    expect(formatRelativeTimeForLocale("2026-02-25T00:00:00Z", "es", { now })).toMatch(
      /hace|ayer|anteayer/,
    );
  });
});
