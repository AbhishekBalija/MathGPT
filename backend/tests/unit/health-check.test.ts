import { describe, expect, it } from "vitest";
import { healthCheck } from "../../src/routes/health.route";

describe("healthCheck", () => {
  it("is healthy when the database answers", async () => {
    const result = await healthCheck(async () => {});
    expect(result.status).toBe(200);
    expect(result.body.status).toBe("healthy");
  });

  it("is 503 when the database fails, without saying why", async () => {
    const result = await healthCheck(async () => {
      throw new Error("password authentication failed for user neondb_owner");
    });
    expect(result.status).toBe(503);
    expect(result.body.status).toBe("unhealthy");
    expect(JSON.stringify(result.body)).not.toContain("password");
  });

  it("is 503 when the database hangs past 3 seconds", async () => {
    const started = Date.now();
    const result = await healthCheck(() => new Promise(() => {}));
    expect(result.status).toBe(503);
    expect(Date.now() - started).toBeLessThan(4000);
  });
});
