import { describe, it, expect, vi, beforeEach } from "vitest";
import { RemoteAdapter } from "../adapters/remote";

const baseUrl = "https://api.example.com/api/features";

describe("RemoteAdapter", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    // @ts-expect-error override global fetch for tests
    global.fetch = fetchMock;
  });

  it("fetches manifest and caches within interval", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "a", label: "A", releasedAt: "2026-02-01", showNewUntil: "2026-03-01" }],
    });
    const adapter = new RemoteAdapter({ url: baseUrl, fetchInterval: 60_000 });
    const manifest1 = await adapter.fetchManifest();
    const manifest2 = await adapter.fetchManifest();
    expect(manifest1[0].id).toBe("a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(manifest2).toBe(manifest1);
  });

  it("syncs state and populates watermark/dismissed", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ watermark: "2026-02-10T00:00:00Z", dismissedIds: ["x"] }),
    });
    const adapter = new RemoteAdapter({ url: baseUrl });
    await adapter.syncState();
    expect(adapter.getWatermark()).toBe("2026-02-10T00:00:00Z");
    expect(adapter.getDismissedIds().has("x")).toBe(true);
  });

  it("POSTs dismiss", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const adapter = new RemoteAdapter({ url: baseUrl });
    adapter.dismiss("feat-1");
    expect(adapter.getDismissedIds().has("feat-1")).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/dismiss`, expect.anything());
  });
});
