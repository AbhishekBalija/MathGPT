import { describe, expect, it } from "vitest";
import { apiUrl } from "./support/test-app";

describe("GET /health", () => {
  it("responds through the in-process app", async () => {
    const res = await fetch(apiUrl("/health"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });
});
