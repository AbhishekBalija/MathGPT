import { describe, expect, it } from "vitest";
import { pathAfterLogin } from "../src/utils/pathAfterLogin";

describe("pathAfterLogin", () => {
  it("sends an Admin to the admin dashboard, even from an old /app tab", () => {
    expect(pathAfterLogin(undefined, true)).toBe("/admin");
    expect(pathAfterLogin("/app", true)).toBe("/admin");
  });

  it("sends a student to the app", () => {
    expect(pathAfterLogin(undefined, false)).toBe("/app");
    expect(pathAfterLogin("/", false)).toBe("/app");
  });

  it("goes back to the page the user was sent away from", () => {
    expect(pathAfterLogin("/admin/reports", true)).toBe("/admin/reports");
    expect(pathAfterLogin("/app", false)).toBe("/app");
  });
});
