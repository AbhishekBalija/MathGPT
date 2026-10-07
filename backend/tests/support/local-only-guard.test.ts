import { describe, expect, it } from "vitest";
import { assertLocalDatabaseUrls } from "./local-only-guard";

describe("test database safety guard", () => {
  it("allows databases on this machine", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://localhost:5432/neomath_test",
        MONGODB_URI: "mongodb://127.0.0.1:27018",
      })
    ).not.toThrow();
  });

  it("refuses a Postgres URL on another host", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://user:secret@ep-cool-name.neon.tech/neondb",
        MONGODB_URI: "mongodb://127.0.0.1:27018",
      })
    ).toThrow(/DATABASE_URL must point to localhost.*ep-cool-name\.neon\.tech/);
  });

  it("refuses a MongoDB URL on another host", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://localhost:5432/neomath_test",
        MONGODB_URI: "mongodb+srv://user:secret@cluster0.mongodb.net",
      })
    ).toThrow(/MONGODB_URI must point to localhost/);
  });

  it("refuses a URL that cannot be parsed", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "not a url",
        MONGODB_URI: "mongodb://127.0.0.1:27018",
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("refuses a local Postgres database not named for tests", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://localhost:5432/neomath",
        MONGODB_URI: "mongodb://127.0.0.1:27018",
      })
    ).toThrow(/database name must end in "_test".*"neomath"/);
  });

  it("never prints the password in the message", () => {
    expect(() =>
      assertLocalDatabaseUrls({
        DATABASE_URL: "postgres://user:secret@db.example.com/prod",
        MONGODB_URI: "mongodb://127.0.0.1:27018",
      })
    ).toThrow(expect.objectContaining({ message: expect.not.stringContaining("secret") }));
  });
});
