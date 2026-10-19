import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingRedirect, WELCOME_SHOWN_KEY } from "../src/features/onboarding/useOnboardingRedirect";
import Welcome from "../src/pages/Welcome";
import authService from "../src/services/auth.service";
import type { User } from "../src/services/auth.service";
import { classService } from "../src/services/class.service";
import { useAuthStore } from "../src/stores/authStore";

vi.mock("../src/services/class.service", () => ({
  classService: { save: vi.fn(), skip: vi.fn() },
}));

const student: User = { id: "u1", email: "asha@example.com", name: "Asha", emailVerified: true };

// Stands in for AppLayout: the real one pulls in the whole solver
function FakeApp() {
  useOnboardingRedirect();
  return <p>Solver</p>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app" element={<FakeApp />} />
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
    </MemoryRouter>
  );
}

function signIn(user: User) {
  useAuthStore.setState({ isAuthenticated: true, user, token: "t" });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.mocked(classService.skip).mockReset();
});

describe("Onboarding redirect", () => {
  it("sends a student who needs onboarding to /welcome", async () => {
    signIn({ ...student, onboarding: "needed" });
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue({ user: { ...student, onboarding: "needed" } });

    renderAt("/app");

    expect(await screen.findByRole("button", { name: "Let's go" })).toBeInTheDocument();
  });

  it("keeps a saved session without the onboarding field on /app until /auth/me answers", async () => {
    signIn(student);
    vi.spyOn(authService, "getCurrentUser").mockReturnValue(new Promise(() => {}));

    renderAt("/app");

    expect(screen.getByText("Solver")).toBeInTheDocument();
  });

  it("sends an older account to /welcome once /auth/me says it is needed", async () => {
    signIn(student);
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue({ user: { ...student, onboarding: "needed" } });

    renderAt("/app");

    expect(await screen.findByRole("button", { name: "Let's go" })).toBeInTheDocument();
  });

  it("does not send them back after /welcome was shown this visit", async () => {
    sessionStorage.setItem(WELCOME_SHOWN_KEY, "1");
    signIn({ ...student, onboarding: "needed" });
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue({ user: { ...student, onboarding: "needed" } });

    renderAt("/app");

    await waitFor(() => expect(authService.getCurrentUser).toHaveBeenCalled());
    expect(screen.getByText("Solver")).toBeInTheDocument();
  });

  it("sends a student who is done from /welcome to /app", () => {
    signIn({ ...student, onboarding: "done" });
    vi.spyOn(authService, "getCurrentUser").mockResolvedValue({ user: { ...student, onboarding: "done" } });

    renderAt("/welcome");

    expect(screen.getByText("Solver")).toBeInTheDocument();
  });
});

describe("Welcome page", () => {
  it("opens the class step from Let's go", () => {
    signIn({ ...student, onboarding: "needed" });
    renderAt("/welcome");

    expect(screen.getByText("Hi, I'm Neo!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));

    expect(screen.getByRole("heading", { name: "Which class are you in?" })).toBeInTheDocument();
  });

  it("skips from the hello screen and opens the app", async () => {
    signIn({ ...student, onboarding: "needed" });
    vi.mocked(classService.skip).mockResolvedValue({ ...student, onboarding: "done" });
    vi.spyOn(authService, "getCurrentUser").mockReturnValue(new Promise(() => {}));
    renderAt("/welcome");

    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(await screen.findByText("Solver")).toBeInTheDocument();
    expect(useAuthStore.getState().user?.onboarding).toBe("done");
  });
});

describe("Shared devices", () => {
  it("forgets that /welcome was shown when someone logs out", async () => {
    sessionStorage.setItem(WELCOME_SHOWN_KEY, "1");
    signIn({ ...student, onboarding: "done" });
    vi.spyOn(authService, "logout").mockResolvedValue({ message: "ok" });

    await useAuthStore.getState().logout();

    expect(sessionStorage.getItem(WELCOME_SHOWN_KEY)).toBeNull();
  });

  it("forgets it when the session is cleared too", () => {
    sessionStorage.setItem(WELCOME_SHOWN_KEY, "1");
    useAuthStore.getState().clearAuth();
    expect(sessionStorage.getItem(WELCOME_SHOWN_KEY)).toBeNull();
  });
});
