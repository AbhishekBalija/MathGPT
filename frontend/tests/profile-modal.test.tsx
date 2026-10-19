import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfileModal from "../src/components/ProfileModal";
import type { ClassInfo } from "../src/features/onboarding/class-options";
import { classService } from "../src/services/class.service";
import type { User } from "../src/services/auth.service";
import { useAppDataStore } from "../src/stores/appDataStore";
import { useAuthStore } from "../src/stores/authStore";
import { useChatStore } from "../src/stores/chatStore";

vi.mock("../src/services/class.service", () => ({
  classService: { save: vi.fn(), skip: vi.fn() },
}));

const cbse: ClassInfo = { range: "class_6_8", helping: false, board: "cbse", state: null, institution: null };
const student: User = { id: "u1", email: "asha@example.com", name: "Asha", onboarding: "done" };

function open(classInfo: ClassInfo | null) {
  useAuthStore.setState({ isAuthenticated: true, user: { ...student, classInfo } });
  useAppDataStore.setState({
    profile: {
      user: { id: "u1", email: "asha@example.com", name: "Asha", provider: "local", createdAt: "2026-10-02T10:00:00.000Z" },
      stats: { totalSolutions: 24, problemTypes: { algebra: 20, unknown: 4 }, lastSolvedAt: null },
      dailyCredits: { used: 1, limit: 5, remaining: 4, resetsAt: "2026-10-20T00:00:00.000Z" },
    },
    profileLoading: false,
    profileError: null,
  } as never);
  useChatStore.setState({ isProfileOpen: true });
  render(<ProfileModal />);
}

beforeEach(() => vi.mocked(classService.save).mockReset());
afterEach(() => cleanup());

describe("Profile popup", () => {
  it("shows the class line, the solved count and the join month", () => {
    open(cbse);
    expect(screen.getByText("Class 6–8 · CBSE")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("Oct 2026")).toBeInTheDocument();
  });

  it("says Not set yet with no class", () => {
    open(null);
    expect(screen.getByText("Not set yet")).toBeInTheDocument();
  });

  it("opens the class steps from Change, and saving returns with the new line", async () => {
    vi.mocked(classService.save).mockResolvedValue({
      ...student,
      classInfo: { ...cbse, range: "class_9_10", board: "icse" },
    });
    open(cbse);

    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    fireEvent.click(screen.getByRole("radio", { name: /Class 9–10/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: "ICSE / ISC" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(screen.getByText("Class 9–10 · ICSE / ISC")).toBeInTheDocument());
    expect(useAuthStore.getState().user?.classInfo?.range).toBe("class_9_10");
  });

  it("has no problem-type bars", () => {
    open(cbse);
    expect(screen.queryByText("Algebra")).toBeNull();
  });
});
