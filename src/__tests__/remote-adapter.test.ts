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
    await adapter.flushPendingDismisses();
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/dismiss`, expect.anything());
  });

  it("batches rapid dismiss calls through dismiss-batch endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const adapter = new RemoteAdapter({ url: baseUrl, dismissBatchWindowMs: 0 });

    adapter.dismiss("a");
    adapter.dismiss("b");
    adapter.dismiss("a");
    await adapter.flushPendingDismisses();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/dismiss-batch`, expect.anything());
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(options.body)).toContain("a");
    expect(String(options.body)).toContain("b");
  });

  it("falls back to single dismiss endpoint when dismiss-batch is unsupported", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValue({ ok: true, json: async () => ({}) });

    const adapter = new RemoteAdapter({ url: baseUrl, dismissBatchWindowMs: 0 });
    adapter.dismiss("a");
    adapter.dismiss("b");
    await adapter.flushPendingDismisses();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/dismiss-batch`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${baseUrl}/dismiss`);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(`${baseUrl}/dismiss`);
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

  it("does not retry non-retryable HTTP statuses", async () => {
    const sleep = vi.fn(async () => {});
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 3,
      sleep,
    });

    const manifest = await adapter.fetchManifest(true);
    expect(manifest).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("coalesces in-flight manifest requests", async () => {
    let resolveFetch: ((value: unknown) => void) | null = null;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const adapter = new RemoteAdapter({ url: baseUrl });
    const first = adapter.fetchManifest(true);
    const second = adapter.fetchManifest(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      json: async () => [{ id: "x", label: "X", releasedAt: "2026-02-01", showNewUntil: "2026-03-01" }],
    });
    const [one, two] = await Promise.all([first, second]);
    expect(one[0].id).toBe("x");
    expect(two[0].id).toBe("x");
  });

  it("coalesces in-flight state sync requests", async () => {
    let resolveFetch: ((value: unknown) => void) | null = null;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const adapter = new RemoteAdapter({ url: baseUrl });
    const first = adapter.syncState();
    const second = adapter.syncState();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      json: async () => ({ watermark: "2026-02-10T00:00:00Z", dismissedIds: ["q"] }),
    });
    await Promise.all([first, second]);
    expect(adapter.getWatermark()).toBe("2026-02-10T00:00:00Z");
    expect(adapter.getDismissedIds().has("q")).toBe(true);
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

  it("retains queued dismisses when flush fails and retries on next flush", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 0,
      dismissBatchWindowMs: 0,
    });

    adapter.dismiss("retry-me");
    await expect(adapter.flushPendingDismisses()).rejects.toThrow("dismiss flush failed");
    await adapter.flushPendingDismisses();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/dismiss`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${baseUrl}/dismiss`);
  });

  it("calls onError hook with operation context for failed requests", async () => {
    const onError = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      retryAttempts: 1,
      dismissBatchWindowMs: 0,
      onError,
      sleep: async () => {},
    });

    adapter.dismiss("err-id");
    await expect(adapter.flushPendingDismisses()).rejects.toThrow("dismiss flush failed");
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenNthCalledWith(
      1,
      expect.any(Error),
      expect.objectContaining({ operation: "dismiss", attempt: 0 }),
    );
    expect(onError).toHaveBeenNthCalledWith(
      2,
      expect.any(Error),
      expect.objectContaining({ operation: "dismiss", attempt: 1 }),
    );
  });

  it("times out stuck dismiss requests", async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    );

    const adapter = new RemoteAdapter({
      url: baseUrl,
      requestTimeoutMs: 5,
      retryAttempts: 0,
      dismissBatchWindowMs: 0,
    });

    adapter.dismiss("timeout-id");
    await expect(adapter.flushPendingDismisses()).rejects.toThrow("dismiss flush failed");
  });

  it("flushes pending dismisses on destroy", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const adapter = new RemoteAdapter({ url: baseUrl, dismissBatchWindowMs: 60_000 });
    adapter.dismiss("teardown-id");

    await adapter.destroy();
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/dismiss`, expect.anything());
  });

  it("runs recovery flush + state sync when browser comes online", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ watermark: "2026-02-11T00:00:00Z", dismissedIds: ["sync-id"] }),
      });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      dismissBatchWindowMs: 60_000,
      syncOnOnline: true,
      syncOnVisibilityChange: false,
    });

    adapter.dismiss("sync-id");
    window.dispatchEvent(new Event("online"));

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/dismiss`);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${baseUrl}/state`);
    expect(adapter.getWatermark()).toBe("2026-02-11T00:00:00Z");

    await adapter.destroy();
  });

  it("runs recovery sync on visibility return", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ watermark: "2026-02-12T00:00:00Z", dismissedIds: [] }),
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    const adapter = new RemoteAdapter({
      url: baseUrl,
      syncOnOnline: false,
      syncOnVisibilityChange: true,
    });

    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/state`);
    expect(adapter.getWatermark()).toBe("2026-02-12T00:00:00Z");

    await adapter.destroy();
  });

  it("syncs state on interval when configured", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ watermark: "2026-02-13T00:00:00Z", dismissedIds: [] }),
      });
      const adapter = new RemoteAdapter({
        url: baseUrl,
        syncOnOnline: false,
        syncOnVisibilityChange: false,
        syncIntervalMs: 1_000,
      });

      await vi.advanceTimersByTimeAsync(3_100);
      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      await adapter.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes online listener on destroy", async () => {
    const adapter = new RemoteAdapter({
      url: baseUrl,
      syncOnOnline: true,
      syncOnVisibilityChange: false,
    });
    await adapter.destroy();

    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
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
