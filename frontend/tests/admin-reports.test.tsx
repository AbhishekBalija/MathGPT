import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getReports, unblockReport } = vi.hoisted(() => ({
  getReports: vi.fn(),
  unblockReport: vi.fn(async () => ({ cacheStatus: "shared" as const })),
}));
vi.mock("../src/services/admin.service", () => ({ default: { getReports, unblockReport } }));

import Reports from "../src/pages/Admin/Reports";

const blocked = {
  id: "r1",
  problemText: "2x = 4",
  answerText: "x = 2",
  reason: "Step 2 is wrong",
  cacheStatus: "blocked",
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  getReports.mockReset();
  unblockReport.mockClear();
  getReports.mockResolvedValue({ reports: [blocked] });
});
afterEach(() => cleanup());

describe("Admin Reports", () => {
  it("shows the problem, the reason and that the answer is blocked", async () => {
    render(<Reports />);

    expect(await screen.findByText("2x = 4")).toBeTruthy();
    expect(screen.getByText('"Step 2 is wrong"')).toBeTruthy();
    expect(screen.getByText("Blocked: not served to anyone")).toBeTruthy();
  });

  it("asks once more before unblocking, then reloads the list", async () => {
    render(<Reports />);
    fireEvent.click(await screen.findByText("Unblock answer"));
    expect(unblockReport).not.toHaveBeenCalled();

    getReports.mockResolvedValue({ reports: [{ ...blocked, cacheStatus: "shared" }] });
    fireEvent.click(screen.getByText("Yes, the answer is right"));

    await waitFor(() => expect(screen.getByText("Unblocked: served from the cache again")).toBeTruthy());
    expect(unblockReport).toHaveBeenCalledWith("r1");
    expect(screen.queryByText("Unblock answer")).toBeNull();
  });

  it("has no unblock button for an instant answer", async () => {
    getReports.mockResolvedValue({ reports: [{ ...blocked, cacheStatus: null }] });
    render(<Reports />);

    expect(await screen.findByText("Instant answer: never cached")).toBeTruthy();
    expect(screen.queryByText("Unblock answer")).toBeNull();
  });
});
