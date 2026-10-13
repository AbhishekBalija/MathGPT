import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
}));
vi.mock("@sentry/bun", () => sentry);

// The shared test setup already loaded the real module; load a fresh copy that uses the mock
let sentryModule: typeof import("../../src/lib/sentry");
beforeAll(async () => {
  vi.resetModules();
  sentryModule = await import("../../src/lib/sentry");
});

const failedSolve = {
  errorCode: "Error",
  errorMessage: "All models failed: primary: 503 | backup: 404",
  userId: "user-1",
  chatId: "chat-1",
  processingTimeMs: 8400,
};

describe("backend Sentry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing without a DSN", async () => {
    sentryModule.initSentry(undefined);
    await sentryModule.reportSolveError(failedSolve);

    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports a failed solve with its code, but never the problem text", async () => {
    sentryModule.initSentry("https://key@sentry.example/1");
    await sentryModule.reportSolveError(failedSolve);

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://key@sentry.example/1",
        dataCollection: expect.objectContaining({ httpBodies: [], httpHeaders: false, cookies: false }),
      })
    );
    const [error, context] = sentry.captureException.mock.calls[0] as [Error, Record<string, unknown>];
    expect(error.message).toBe("Solve failed (Error): All models failed: primary: 503 | backup: 404");
    expect(context).toMatchObject({
      tags: { errorCode: "Error" },
      user: { id: "user-1" },
      extra: { chatId: "chat-1", processingTimeMs: 8400 },
    });
    expect(JSON.stringify(context)).not.toContain("problem");
    // Vercel may pause the function after the response, so send right away
    expect(sentry.flush).toHaveBeenCalled();
  });
});
