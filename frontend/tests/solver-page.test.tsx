import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api", () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import api from "../src/services/api";
import { SolverPage } from "../src/features/solver/SolverPage";
import { useChatStore, type Chat, type Solution } from "../src/stores/chatStore";
import { SOLVE_ERROR_COPY } from "../src/utils/errorMessages";

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

function oldSolution(id: string, problem: string): Solution {
  return {
    id,
    problem,
    problemType: "algebra",
    steps: [
      {
        stepNumber: 1,
        expression: "x = 1",
        justification: "Take 1 from both sides",
        explanation: "Moving the 1 across.",
        status: "VERIFIED",
      },
    ],
    finalAnswer: "x = 1",
    summary: "",
    processingTimeMs: 10,
    createdAt: new Date(),
  };
}

function savedChat(id: string, problem: string, createdAt: Date): Chat {
  return {
    id,
    title: problem,
    messages: [{ id: "m", role: "user", content: problem, timestamp: createdAt }],
    solutionId: `sol-${id}`,
    createdAt,
    updatedAt: createdAt,
  };
}

// Open a saved problem by giving the store a solution, like the real fetch does.
function fakeFetchSolution() {
  return vi.fn(async (chatId: string) => {
    useChatStore.setState((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, solution: oldSolution(`sol-${chatId}`, c.title) } : c)),
    }));
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SolverPage />
    </MemoryRouter>,
  );
}


// getByRole breaks in jsdom once the KaTeX stylesheet is loaded, so find buttons by label or text.
function queryBtn(name: string): HTMLButtonElement | null {
  const byLabel = screen.queryByLabelText(name);
  if (byLabel instanceof HTMLButtonElement) return byLabel;
  const byText = screen.queryAllByText(name).find((el) => el instanceof HTMLButtonElement);
  return (byText as HTMLButtonElement | undefined) ?? null;
}
function btn(name: string): HTMLButtonElement {
  const found = queryBtn(name);
  if (!found) throw new Error(`No button named "${name}"`);
  return found;
}
const field = () => screen.getByLabelText("Your math problem") as HTMLTextAreaElement;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockResolvedValue({ data: { dailyCredits: { remaining: 3 } } });
  useChatStore.setState({
    chats: [],
    activeChatId: null,
    isLoading: false,
    solutionLoading: false,
    historyLoaded: true,
    solveError: null,
    pendingProblem: null,
    view: "all",
    fetchSolution: fakeFetchSolution(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("history sidebar", () => {
  it("filters history by search text", () => {
    const now = new Date();
    useChatStore.setState({
      chats: [savedChat("1", "Derivative of sin(x)", now), savedChat("2", "Solve x^2 = 4", now)],
    });
    renderPage();
    expect(btn("Solve x^2 = 4")).toBeTruthy();
    fireEvent.click(btn("Search problems"));
    fireEvent.change(screen.getByLabelText("Search your problems"), { target: { value: "sin" } });
    expect(btn("Derivative of sin(x)")).toBeTruthy();
    expect(queryBtn("Solve x^2 = 4")).toBeNull();
  });

  it("deletes with Undo and only calls the API if not undone", () => {
    vi.useFakeTimers();
    const deleteChat = vi.fn(async () => true);
    useChatStore.setState({ chats: [savedChat("1", "Derivative of sin(x)", new Date())], deleteChat });
    renderPage();

    fireEvent.click(btn("Delete Derivative of sin(x)"));
    expect(queryBtn("Derivative of sin(x)")).toBeNull();
    expect(screen.getByText(/Problem deleted/)).toBeTruthy();

    fireEvent.click(btn("Undo"));
    expect(btn("Derivative of sin(x)")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(deleteChat).not.toHaveBeenCalled();

    // Without Undo the delete goes through after 5 seconds
    fireEvent.click(btn("Delete Derivative of sin(x)"));
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(deleteChat).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(deleteChat).toHaveBeenCalledWith("1", "sol-1");
  });
});

describe("opening saved problems", () => {
  it("opens an old saved solution without any Verified text", async () => {
    useChatStore.setState({ chats: [savedChat("1", "x + 1 = 2", new Date())] });
    renderPage();
    fireEvent.click(btn("x + 1 = 2"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
    expect(document.body.textContent ?? "").not.toMatch(/verified/i);
  });

  it("moves to the previous and next problem", async () => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    useChatStore.setState({
      chats: [
        savedChat("3", "Third problem", new Date(now)),
        savedChat("2", "Second problem", new Date(now - day)),
        savedChat("1", "First problem", new Date(now - 2 * day)),
      ],
    });
    renderPage();
    fireEvent.click(btn("First problem"));
    await waitFor(() => expect(screen.getByText("Problem 1 of 3")).toBeTruthy());
    expect(btn("Previous problem").disabled).toBe(true);

    fireEvent.click(btn("Next problem"));
    await waitFor(() => expect(screen.getByText("Problem 2 of 3")).toBeTruthy());
    expect(useChatStore.getState().activeChatId).toBe("2");

    fireEvent.click(btn("Next problem"));
    await waitFor(() => expect(screen.getByText("Problem 3 of 3")).toBeTruthy());
    fireEvent.click(btn("Previous problem"));
    await waitFor(() => expect(screen.getByText("Problem 2 of 3")).toBeTruthy());
  });
});

describe("solving", () => {
  const apiSolution = (id: string) => ({
    data: { success: true, solution: { ...oldSolution(id, "x + 1 = 2"), createdAt: new Date().toISOString() } },
  });

  it("shows the free-problems line from the profile", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("3 of 5 free problems left today")).toBeTruthy());
  });

  it("solves a problem, clears the field and shows steps", async () => {
    post.mockResolvedValue(apiSolution("s1"));
    renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
    expect(field().value).toBe("");
    expect(document.body.textContent ?? "").not.toMatch(/verified/i);
  });

  it("falls back to the full solution when an answer has no hint", async () => {
    post.mockResolvedValue(apiSolution("s1"));
    renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Just a hint"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
  });

  it("shows the rate limit with a countdown and keeps the problem", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { error: "x", code: "RATE_LIMITED", retryAfter: 40 } },
    });
    renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText(SOLVE_ERROR_COPY.rateLimit)).toBeTruthy());
    expect(screen.getByText("0:40")).toBeTruthy();
    expect(field().value).toBe("x + 1 = 2");
  });

  it("shows a network message and Try again solves the same problem", async () => {
    post.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce(apiSolution("s2"));
    renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText(SOLVE_ERROR_COPY.network)).toBeTruthy());
    fireEvent.click(btn("Try again"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toMatchObject({ problem: "x + 1 = 2" });
  });

  it("cancels the request and keeps the text in the field", async () => {
    let signal: AbortSignal | undefined;
    post.mockImplementation((_url, _body, config) => {
      signal = config?.signal as AbortSignal | undefined;
      return new Promise(() => {});
    });
    renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(btn("Cancel")).toBeTruthy());
    fireEvent.click(btn("Cancel"));
    expect(signal?.aborted).toBe(true);
    expect(queryBtn("Cancel")).toBeNull();
    expect(field().value).toBe("x + 1 = 2");
  });

  it("gives a re-solve of the same chat a new solution id", async () => {
    post.mockResolvedValue(apiSolution("same-id"));
    renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
    const firstStep = document.querySelector("li");
    // Ask for another problem: the old steps are replaced, not reused
    fireEvent.change(field(), { target: { value: "y + 1 = 3" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(document.querySelector("li")).not.toBe(firstStep));
  });
});
