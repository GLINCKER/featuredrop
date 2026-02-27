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

  it("retries failed manifest requests with exponential backoff", async () => {
    const sleep = vi.fn(async () => {});
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "b", label: "B", releasedAt: "2026-02-01", showNewUntil: "2026-03-01" }],
      });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 1,
      retryBaseDelayMs: 25,
      sleep,
    });

    const manifest = await adapter.fetchManifest(true);
    expect(manifest[0].id).toBe("b");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it("falls back to stale manifest when refresh fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "cached", label: "Cached", releasedAt: "2026-02-01", showNewUntil: "2026-03-01" }],
      })
      .mockResolvedValue({
        ok: false,
        status: 503,
      });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 0,
    });

    const initial = await adapter.fetchManifest(true);
    const fallback = await adapter.fetchManifest(true);
    expect(initial[0].id).toBe("cached");
    expect(fallback[0].id).toBe("cached");
  });

  it("opens the circuit breaker after consecutive failed operations", async () => {
    let now = 0;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 0,
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownMs: 1000,
      now: () => now,
      sleep: async () => {},
    });

    await adapter.fetchManifest(true);
    await adapter.fetchManifest(true);
    await adapter.fetchManifest(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    now += 1001;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "recovered", label: "Recovered", releasedAt: "2026-02-01", showNewUntil: "2026-03-01" }],
    });

    const manifest = await adapter.fetchManifest(true);
    expect(manifest[0].id).toBe("recovered");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports health based on circuit and endpoint status", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    const healthyAdapter = new RemoteAdapter({ url: baseUrl });
    await expect(healthyAdapter.isHealthy()).resolves.toBe(true);

    let now = 0;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });
    const unhealthyAdapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 0,
      circuitBreakerThreshold: 1,
      circuitBreakerCooldownMs: 1000,
      now: () => now,
      sleep: async () => {},
    });

    await unhealthyAdapter.fetchManifest(true);
    await expect(unhealthyAdapter.isHealthy()).resolves.toBe(false);
    now += 1001;
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });
    await expect(unhealthyAdapter.isHealthy()).resolves.toBe(true);
  });
});
