import { describe, expect, it } from "vitest";
import { resolveTranslations } from "../i18n";

describe("resolveTranslations", () => {
  it("returns english defaults when locale is omitted", () => {
    const t = resolveTranslations();
    expect(t.whatsNewTitle).toBe("What's New");
    expect(t.loadMore).toBe("Load more");
  });

  it("resolves locale dictionaries and keeps fallback step formatter", () => {
    const t = resolveTranslations("fr");
    expect(t.whatsNewTitle).toBe("Nouveautés");
    expect(t.markAllRead).toBe("Tout marquer comme lu");
    expect(t.stepOf(2, 5)).toBe("Step 2 of 5");
  });

  it("applies custom overrides over locale defaults", () => {
    const t = resolveTranslations("es", {
      submit: "Enviar ahora",
    });
    expect(t.submit).toBe("Enviar ahora");
    expect(t.close).toBe("Cerrar");
  });
});
