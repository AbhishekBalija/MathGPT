import { describe, expect, it } from "vitest";
import { assertLocalDatabaseUrls } from "./local-only-guard";

describe("test database safety guard", () => {
  it("allows databases on this machine", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://localhost:5432/neomath_test",
      })
    ).not.toThrow();
  });

  it("refuses a Postgres URL on another host", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://user:secret@ep-cool-name.neon.tech/neondb",
      })
    ).toThrow(/DATABASE_URL must point to localhost.*ep-cool-name\.neon\.tech/);
  });

  it("refuses a URL that cannot be parsed", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "not a url",
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("refuses a local Postgres database not named for tests", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://localhost:5432/neomath",
      })
    ).toThrow(/database name must end in "_test".*"neomath"/);
  });

  it("never prints the password in the message", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://user:secret@db.example.com/prod",
      })
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining("secret") }));
  });
});
