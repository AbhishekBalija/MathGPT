import { afterEach, describe, expect, it, vi } from "vitest";
import { createRealHealthProbes } from "../../src/modules/admin/health/probes";

function resendAnswers(status: number, body: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("the email health probe", () => {
  const probes = createRealHealthProbes({ RESEND_API: "re_test" });

  it("is up for a send-only key, which Resend won't let list domains", async () => {
    resendAnswers(401, { statusCode: 401, name: "restricted_api_key", message: "This API key is restricted to only send emails" });
    await expect(probes.email()).resolves.toBeUndefined();
  });

  it("is down for a key Resend says is invalid", async () => {
    resendAnswers(400, { statusCode: 400, name: "validation_error", message: "API key is invalid" });
    await expect(probes.email()).rejects.toThrow("Resend answered 400");
  });

  it("is up for a full-access key", async () => {
    resendAnswers(200, { data: [] });
    await expect(probes.email()).resolves.toBeUndefined();
  });
});
