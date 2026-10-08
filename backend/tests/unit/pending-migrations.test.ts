import { describe, expect, it } from "vitest";
import { findPendingMigrations } from "../../scripts/check-migrations";

const journal = [
  { tag: "0000_baseline", when: 100 },
  { tag: "0001_users", when: 200 },
  { tag: "0002_solutions", when: 300 },
];

describe("findPendingMigrations", () => {
  it("finds nothing when the database has every migration", () => {
    expect(findPendingMigrations(journal, [100, 200, 300])).toEqual([]);
  });

  it("lists migrations the database has not applied, in order", () => {
    expect(findPendingMigrations(journal, [100])).toEqual(["0001_users", "0002_solutions"]);
  });

  it("treats a brand-new database as missing everything", () => {
    expect(findPendingMigrations(journal, [])).toEqual([
      "0000_baseline",
      "0001_users",
      "0002_solutions",
    ]);
  });
});
