import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const service = vi.hoisted(() => ({
  getFailed: vi.fn(),
  getFailedDetail: vi.fn(),
  resolveFailed: vi.fn(async () => ({ resolved: 3 })),
  getReports: vi.fn(),
  getReportDetail: vi.fn(),
  unblockReport: vi.fn(async () => ({ cacheStatus: "shared" as const })),
  getFeedback: vi.fn(),
  markFeedbackDone: vi.fn(async () => ({ done: true })),
  getUsers: vi.fn(),
  getStudent: vi.fn(),
  deleteUser: vi.fn(async () => ({ success: true, deletedSolutions: 4 })),
  setTeam: vi.fn(async () => ({ id: "s1", isTeam: true })),
  updateUserRole: vi.fn(),
  getAnalytics: vi.fn(),
}));
vi.mock("../src/services/admin.service", () => ({ default: service }));

import Events from "../src/pages/Admin/Events";
import FailedSolves from "../src/pages/Admin/FailedSolves";
import Feedback from "../src/pages/Admin/Feedback";
import Reports from "../src/pages/Admin/Reports";
import Students from "../src/pages/Admin/Students";

const NOW = new Date().toISOString();
const LONG_PROBLEM = "Math 22 worksheet. 1. ∫ x sin x dx\n".repeat(60).slice(0, 2000);

function group(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    problem: "(logx)^2/x",
    tries: 3,
    firstAt: NOW,
    lastAt: NOW,
    errorCode: "AI_TIMEOUT",
    ms: 8400,
    student: { id: "s1", name: "Shashi" },
    workedLater: false,
    resolved: false,
    ...overrides,
  };
}

const GROUPS = [
  group(),
  group({ id: "g2", problem: "∫ sin^2 (2x+5)", tries: 1, student: null, errorCode: "AI_UNREACHABLE" }),
  group({ id: "g3", problem: "Integrate x cos x", tries: 1, workedLater: true }),
  group({ id: "g4", problem: LONG_PROBLEM, tries: 1 }),
  group({ id: "g5", problem: "d/dx tan x", tries: 1 }),
];

function detail(id: string) {
  const found = GROUPS.find((entry) => entry.id === id) ?? GROUPS[0];
  return {
    ...found,
    attempts: Array.from({ length: found.tries }, () => ({
      at: NOW,
      ms: 8400,
      errorCode: found.errorCode,
      details: { attempts: [{ model: "gemini-2.5-flash", error: "timed out" }], promptVersion: "v9", fullMessage: "All models failed: gemini-2.5-flash: timed out" },
    })),
  };
}

function renderAt(path: string, page: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={`/admin/${page}/:id?`} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  for (const mock of Object.values(service)) mock.mockClear();
  service.getFailed.mockResolvedValue({ groups: GROUPS, problems: 5, tries: 7 });
  service.getFailedDetail.mockImplementation(async (id: string) => detail(id));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Failed solves", () => {
  it("counts problems and tries, and shows repeats, the error type and what happened later", async () => {
    renderAt("/admin/failed", "failed", <FailedSolves />);

    expect(await screen.findByText("5 problems · 7 tries")).toBeTruthy();
    expect(screen.getByText("×3")).toBeTruthy();
    expect(screen.getAllByText("AI timed out").length).toBeGreaterThan(0);
    expect(screen.getByText("AI unreachable")).toBeTruthy();
    expect(screen.getByText("worked on the next try")).toBeTruthy();
    expect(screen.getByText(/Deleted account/)).toBeTruthy();
    expect(service.getFailed).toHaveBeenCalledWith("open");
  });

  it("clamps a long problem to 2 lines in the list and shows all of it in the details", async () => {
    renderAt("/admin/failed/g4", "failed", <FailedSolves />);

    const panel = await screen.findByRole("complementary", { name: "Details" });
    await waitFor(() => expect(within(panel).getByText((_, node) => node?.textContent === LONG_PROBLEM && node.tagName === "H2")).toBeTruthy());
    const row = screen.getAllByRole("link").find((link) => link.getAttribute("href") === "/admin/failed/g4");
    expect(row?.querySelector(".line-clamp-2")?.textContent).toBe(LONG_PROBLEM);
  });

  it("opens the item in the address, with each try and Copy for Claude", async () => {
    renderAt("/admin/failed/g1", "failed", <FailedSolves />);

    const panel = await screen.findByRole("complementary", { name: "Details" });
    expect(service.getFailedDetail).toHaveBeenCalledWith("g1");
    expect(await within(panel).findByText("Try 3")).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Copy for Claude" })).toBeTruthy();
    expect(within(panel).getByText("gemini-2.5-flash: timed out")).toBeTruthy();
  });

  it("Mark resolved hides it at once and only calls the API after 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt("/admin/failed/g1", "failed", <FailedSolves />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark all 3 resolved" }));

    expect(screen.queryByText("(logx)^2/x")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Marked resolved");
    expect(service.resolveFailed).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(service.resolveFailed).toHaveBeenCalledWith("g1");
  });

  it("Undo within 5 seconds brings it back and calls nothing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt("/admin/failed/g1", "failed", <FailedSolves />);
    fireEvent.click(await screen.findByRole("button", { name: "Mark all 3 resolved" }));

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(service.resolveFailed).not.toHaveBeenCalled();
    expect(screen.getAllByText("(logx)^2/x").length).toBeGreaterThan(0);
  });
});

describe("Reports", () => {
  const report = {
    id: "r1",
    problemText: "If y = log(sec x + tan x), find dy/dx",
    answerText: "\\sec x",
    reason: "Step 2 is wrong",
    cacheStatus: "blocked",
    createdAt: NOW,
  };

  beforeEach(() => {
    service.getReports.mockResolvedValue({ reports: [report] });
    service.getReportDetail.mockResolvedValue({
      ...report,
      checkedByCode: false,
      solution: { steps: [{ reason: "Use the chain rule" }], answer: { latex: "\\sec x" } },
      solvedAt: NOW,
      student: { id: "s1", name: "Abhi Chess" },
    });
  });

  it("asks before unblocking, and only unblocks after you confirm", async () => {
    renderAt("/admin/reports/r1", "reports", <Reports />);

    fireEvent.click(await screen.findByRole("button", { name: "Unblock answer" }));
    expect(screen.getByText("Unblock and share this answer with everyone?")).toBeTruthy();
    expect(service.unblockReport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Yes, unblock" }));

    await waitFor(() => expect(service.unblockReport).toHaveBeenCalledWith("r1"));
  });

  it("shows the reason, the steps and whether code checked the answer", async () => {
    renderAt("/admin/reports/r1", "reports", <Reports />);

    const panel = await screen.findByRole("complementary", { name: "Details" });
    expect(await within(panel).findByText("Not checked by code")).toBeTruthy();
    expect(within(panel).getByText("Step 2 is wrong")).toBeTruthy();
    expect(within(panel).getByText("Use the chain rule")).toBeTruthy();
  });
});

describe("Feedback", () => {
  const idea = {
    id: "f1",
    kind: "idea",
    message: "Add a graph of the answer",
    page: "/app",
    solutionId: null,
    userId: "s1",
    name: "Asha",
    email: "asha@example.com",
    done: false,
    createdAt: NOW,
  };

  beforeEach(() => {
    service.getFeedback.mockResolvedValue({ feedback: [idea, { ...idea, id: "f2", kind: "bug", message: "The keypad hides the answer" }] });
  });

  it("filters by type", async () => {
    renderAt("/admin/feedback", "feedback", <Feedback />);
    await screen.findByText("Add a graph of the answer");

    fireEvent.click(screen.getByRole("link", { name: /^Bug\s*\d+$/ }));

    await waitFor(() => expect(screen.queryByText("Add a graph of the answer")).toBeNull());
    expect(screen.getByText("The keypad hides the answer")).toBeTruthy();
  });

  it("shows who sent it, and Mark done waits 5 seconds before saving", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt("/admin/feedback/f1", "feedback", <Feedback />);

    const panel = await screen.findByRole("complementary", { name: "Details" });
    expect(within(panel).getByText(/asha@example.com/)).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Mark done" }));

    expect(service.markFeedbackDone).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(service.markFeedbackDone).toHaveBeenCalledWith("f1");
  });
});

describe("Students", () => {
  beforeEach(() => {
    service.getUsers.mockResolvedValue({
      users: [
        { id: "s1", name: "Shashi", email: "shashi@example.com", isAdmin: false, isTeam: false, solves: 4, lastSolvedAt: NOW, provider: "google", createdAt: NOW },
        { id: "a1", name: "Abhishek", email: "abhi@example.com", isAdmin: true, isTeam: true, solves: 0, lastSolvedAt: null, provider: "google", createdAt: NOW },
      ],
      total: 2,
      page: 1,
      limit: 50,
    });
    service.getStudent.mockResolvedValue({
      id: "s1",
      name: "Shashi",
      email: "shashi@example.com",
      provider: "google",
      joinedAt: NOW,
      isAdmin: false,
      isTeam: false,
      solves: 4,
      failed: 5,
      reports: 0,
      usedToday: 1,
      dailyLimit: 5,
      history: [{ kind: "solved", title: "Integrate x^2", at: NOW }],
    });
  });

  it("lists students with their solves and tags admins", async () => {
    renderAt("/admin/students", "students", <Students />);

    expect(await screen.findByText("Shashi")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("never solved")).toBeTruthy();
  });

  it("asks before deleting, and names what goes", async () => {
    renderAt("/admin/students/s1", "students", <Students />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete account" }));

    expect(screen.getByText("Delete Shashi's account? Their 4 solutions, reports and feedback go too. Failed solves stay, without their name.")).toBeTruthy();
    expect(service.deleteUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
    await waitFor(() => expect(service.deleteUser).toHaveBeenCalledWith("s1"));
  });

  it("Mark as team waits 5 seconds, so it can be undone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt("/admin/students/s1", "students", <Students />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark as team" }));

    expect(screen.getByRole("status").textContent).toContain("Marked as team");
    expect(service.setTeam).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(service.setTeam).toHaveBeenCalledWith("s1", true);
  });

  it("tapping again while it waits takes the change back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt("/admin/students/s1", "students", <Students />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark as team" }));
    fireEvent.click(screen.getByRole("button", { name: "Not team" }));
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(service.setTeam).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mark as team" })).toBeTruthy();
  });
});

describe("Events", () => {
  it("filters by event and shows one event's details", async () => {
    const events = [
      { id: "e1", eventName: "solution_saved", properties: { problemType: "calculus_integral", processingTimeMs: 14900, source: "ai", model: "gemini-2.5-flash" }, createdAt: NOW },
      { id: "e2", eventName: "solve_error", properties: { errorCode: "AI_TIMEOUT", processingTimeMs: 33054 }, createdAt: NOW },
    ];
    service.getAnalytics.mockImplementation(async (event?: string) => ({
      eventsByType: [
        { eventName: "solution_saved", count: 12 },
        { eventName: "solve_error", count: 8 },
      ],
      recentEvents: events.filter((entry) => !event || entry.eventName === event),
      totalEvents: 20,
    }));
    renderAt("/admin/events/e1", "events", <Events />);

    const panel = await screen.findByRole("complementary", { name: "Details" });
    // The panel appears before its details load; wait for them (slow CI runners)
    expect(await within(panel).findByText(/"model": "gemini-2.5-flash"/)).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: /^solve_error\s*\d+$/ }));
    await waitFor(() => expect(screen.queryByText("calculus_integral · 14,900 ms")).toBeNull());
    expect(service.getAnalytics).toHaveBeenLastCalledWith("solve_error");
    expect(screen.getByText("AI_TIMEOUT · 33,054 ms")).toBeTruthy();
  });
});
