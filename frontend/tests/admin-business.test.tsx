import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getBusiness } = vi.hoisted(() => ({ getBusiness: vi.fn() }));
vi.mock("../src/services/admin.service", () => ({ default: { getBusiness } }));

import Business from "../src/pages/Admin/Business";
import type { AdminBusiness } from "../src/services/admin.service";

function business(overrides: Partial<AdminBusiness> = {}): AdminBusiness {
  return {
    numbers: { students: 3, activeThisWeek: 2, activeRate: 67, solvesPerActive: 4, limitHits: 1 },
    newPerDay: Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-${String(9 + i).padStart(2, "0")}`, count: i % 2 })),
    funnel: { signedUp: 3, verified: 3, solved: 2, cameBack: 1 },
    cohorts: [
      { weekStart: "2026-10-12", students: 2, weeks: [100] },
      { weekStart: "2026-10-05", students: 1, weeks: [100, 100] },
      { weekStart: "2026-09-28", students: 0, weeks: [] },
    ],
    cost: { tokensToday: 28680, avgTokensPerSolve: 2868 },
    topics: [{ problemType: "calculus_integral", count: 2 }],
    hiddenTeam: 2,
    ...overrides,
  };
}

function renderBusiness() {
  return render(
    <MemoryRouter>
      <Business />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getBusiness.mockReset();
  getBusiness.mockResolvedValue(business());
});
afterEach(() => cleanup());

describe("admin Business", () => {
  it("leaves team accounts out, and the checkbox brings them back", async () => {
    renderBusiness();
    await screen.findByText("Real students");
    expect(getBusiness).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByLabelText("Include team accounts (2 hidden)"));

    await waitFor(() => expect(getBusiness).toHaveBeenLastCalledWith(true));
  });

  it("marks this week in the cohort table, since it is not over yet", async () => {
    renderBusiness();

    expect(await screen.findByText("12 to 18 Oct")).toBeTruthy();
    // This week's cohort has one cell, which is this week
    const row = screen.getByText("12 to 18 Oct").closest("tr");
    expect(row?.textContent).toContain("100%*");
    // Last week's cohort: week 0 is done, week 1 is this week
    const lastWeek = screen.getByText("5 to 11 Oct").closest("tr");
    expect(lastWeek?.textContent).toContain("100%100%*");
  });

  it("says so when there are no real students yet", async () => {
    getBusiness.mockResolvedValue(
      business({
        numbers: { students: 0, activeThisWeek: 0, activeRate: 0, solvesPerActive: 0, limitHits: 0 },
        funnel: { signedUp: 0, verified: 0, solved: 0, cameBack: 0 },
        cohorts: [],
        topics: [],
      }),
    );
    renderBusiness();

    expect((await screen.findAllByText("No real students yet.")).length).toBeGreaterThan(0);
  });
});
