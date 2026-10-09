import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api", () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import api from "../src/services/api";
import * as adapter from "../src/features/solver/model/adapter";
import { SolverPage } from "../src/features/solver/SolverPage";
import { useChatStore, type Chat, type Solution } from "../src/stores/chatStore";
import { SOLVE_ERROR_COPY } from "../src/utils/errorMessages";
import { division156, quadratic } from "./fixtures/solutions";

// The real fetchSolution, kept before each test swaps in a fake one.
const realFetchSolution = useChatStore.getState().fetchSolution;

// Old saved solutions have no other methods, so give them one to test "Change".
vi.mock("../src/features/solver/model/adapter", async (importOriginal) => {
  const real = await importOriginal<typeof adapter>();
  return {
    ...real,
    toSolutionV2: (old: Parameters<typeof real.toSolutionV2>[0]) => {
      const solution = real.toSolutionV2(old);
      return {
        ...solution,
        header: { ...solution.header, method: { id: "main", label: "Main method", alternatives: [{ id: "alt", label: "Other way" }] } },
      };
    },
  };
});

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
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, solution: adapter.toSolutionV2(oldSolution(`sol-${chatId}`, c.title)) } : c,
      ),
    }));
  });
}

// Waits for the first credits fetch, so no update happens outside act().
async function renderPage() {
  await act(async () => {
    render(
      <MemoryRouter>
        <SolverPage />
      </MemoryRouter>,
    );
  });
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
  it("filters history by search text", async () => {
    const now = new Date();
    useChatStore.setState({
      chats: [savedChat("1", "Derivative of sin(x)", now), savedChat("2", "Solve x^2 = 4", now)],
    });
    await renderPage();
    expect(btn("Solve x^2 = 4")).toBeTruthy();
    fireEvent.click(btn("Search problems"));
    fireEvent.change(screen.getByLabelText("Search your problems"), { target: { value: "sin" } });
    expect(btn("Derivative of sin(x)")).toBeTruthy();
    expect(queryBtn("Solve x^2 = 4")).toBeNull();
  });

  it("deletes with Undo and only calls the API if not undone", async () => {
    vi.useFakeTimers();
    const deleteChat = vi.fn(async () => true);
    useChatStore.setState({ chats: [savedChat("1", "Derivative of sin(x)", new Date())], deleteChat });
    await renderPage();

    fireEvent.click(btn("Delete Derivative of sin(x)"));
    expect(queryBtn("Derivative of sin(x)")).toBeNull();
    expect(screen.getByText(/Problem deleted/)).toBeTruthy();

    fireEvent.click(btn("Undo"));
    expect(btn("Derivative of sin(x)")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(deleteChat).not.toHaveBeenCalled();

    // Without Undo the delete goes through after 5 seconds
    fireEvent.click(btn("Delete Derivative of sin(x)"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4900);
    });
    expect(deleteChat).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(deleteChat).toHaveBeenCalledWith("1", "sol-1", { silent: true });
  });
});

describe("opening saved problems", () => {
  it("opens an old saved solution without any Verified text", async () => {
    useChatStore.setState({ chats: [savedChat("1", "x + 1 = 2", new Date())] });
    await renderPage();
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
    await renderPage();
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
    await renderPage();
    expect(screen.getByText("3 of 5 free problems left today")).toBeTruthy();
  });

  it("solves a problem, clears the field and shows steps", async () => {
    post.mockResolvedValue(apiSolution("s1"));
    await renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
    expect(field().value).toBe("");
    expect(document.body.textContent ?? "").not.toMatch(/verified/i);
  });

  it("falls back to the full solution when an answer has no hint", async () => {
    post.mockResolvedValue(apiSolution("s1"));
    await renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Just a hint"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
  });

  it("shows the rate limit with a countdown and keeps the problem", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { error: "x", code: "RATE_LIMITED", retryAfter: 40 } },
    });
    await renderPage();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText(SOLVE_ERROR_COPY.rateLimit)).toBeTruthy());
    expect(screen.getByText("0:40")).toBeTruthy();
    expect(field().value).toBe("x + 1 = 2");
  });

  it("shows a network message and Try again solves the same problem", async () => {
    post.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce(apiSolution("s2"));
    await renderPage();
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
    await renderPage();
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
    await renderPage();
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

  it("asks for the free problems again after a solve and updates the line", async () => {
    get.mockReset();
    get
      .mockResolvedValueOnce({ data: { dailyCredits: { remaining: 3 } } })
      .mockResolvedValue({ data: { dailyCredits: { remaining: 2 } } });
    post.mockResolvedValue(apiSolution("s1"));
    await renderPage();
    expect(screen.getByText("3 of 5 free problems left today")).toBeTruthy();
    fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByText("2 of 5 free problems left today")).toBeTruthy());
    expect(get).toHaveBeenCalledTimes(2);
  });

  describe("with a solution on screen", () => {
    const twoSteps = () => {
      const base = apiSolution("same-id");
      base.data.solution.steps = [
        ...base.data.solution.steps,
        { stepNumber: 2, expression: "y = 2", justification: "Second step", explanation: "More.", status: "VERIFIED" },
      ];
      return base;
    };

    async function solveOnce() {
      post.mockResolvedValueOnce(twoSteps());
      await renderPage();
      fireEvent.change(field(), { target: { value: "x + 1 = 2" } });
      fireEvent.click(btn("Solve"));
      await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
    }

    it("a method change re-solves with the method and starts the steps again", async () => {
      await solveOnce();
      fireEvent.click(btn("One at a time"));
      fireEvent.click(btn("Next step"));
      expect(screen.getByText("Second step")).toBeTruthy();

      post.mockResolvedValueOnce(twoSteps());
      fireEvent.click(btn("Change"));
      fireEvent.click(btn("Other way"));
      await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
      expect(post.mock.calls[1][1]).toMatchObject({ method: "alt", problem: "x + 1 = 2" });
      // Same backend id, but a new solution id: the step mode starts again at one step
      await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
      expect(screen.queryByText("Second step")).toBeNull();
    });

    it("keeps the earlier solution after Cancel", async () => {
      await solveOnce();
      post.mockImplementationOnce(() => new Promise(() => {}));
      fireEvent.click(btn("Change"));
      fireEvent.click(btn("Other way"));
      await waitFor(() => expect(btn("Cancel")).toBeTruthy());
      expect(screen.queryByText("Take 1 from both sides")).toBeNull();
      fireEvent.click(btn("Cancel"));
      expect(queryBtn("Cancel")).toBeNull();
      expect(screen.getByText("Take 1 from both sides")).toBeTruthy();
    });
  });
});

describe("on a phone", () => {
  const realMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("starts with a Type a problem bar that opens the focused input with the keypad", async () => {
    await renderPage();
    expect(screen.queryByLabelText("Your math problem")).toBeNull();
    fireEvent.click(btn("Type a problem"));
    expect(screen.getByRole("dialog", { name: "Ask a problem" })).toBeTruthy();
    expect(field()).toBeTruthy();
    expect(screen.getByLabelText("Show math keypad")).toBeTruthy();
    fireEvent.click(btn("Close"));
    expect(screen.queryByLabelText("Your math problem")).toBeNull();
  });

  it("an example opens the input screen with the problem filled in", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("Class 10").closest("button") as HTMLButtonElement);
    expect(field().value).toBe("x^2 + 5x + 6 = 0");
  });
});

// The v2 reply of POST /api/solve: the typed blocks come in `content`.
function v2Reply(content: Omit<typeof division156, "id" | "createdAt">) {
  return { data: { success: true, solution: { id: "v2-id", createdAt: new Date().toISOString(), formatVersion: 2, content } } };
}

describe("typed-block solutions", () => {
  it("shows a v2 reply's blocks directly, with the long division grid", async () => {
    post.mockResolvedValue(v2Reply(division156));
    await renderPage();
    fireEvent.change(field(), { target: { value: "156 / 4" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(screen.getByRole("img", { name: "156 divided by 4" })).toBeTruthy());
  });

  it("opens an old (format 1) history item through the adapter", async () => {
    useChatStore.setState({
      fetchSolution: realFetchSolution,
      chats: [{ ...savedChat("old", "x + 1 = 2", new Date()), solutionId: "old-sol" }],
    });
    get.mockImplementation(async (url: string) =>
      url === "/api/solution/old-sol"
        ? {
            data: {
              success: true,
              solution: { ...oldSolution("old-sol", "x + 1 = 2"), createdAt: new Date().toISOString(), formatVersion: 1, content: null },
            },
          }
        : { data: { dailyCredits: { remaining: 3 } } },
    );
    await renderPage();
    fireEvent.click(btn("x + 1 = 2"));
    await waitFor(() => expect(screen.getByText("Take 1 from both sides")).toBeTruthy());
  });

  it("opens a v2 history item from its content", async () => {
    useChatStore.setState({
      fetchSolution: realFetchSolution,
      chats: [{ ...savedChat("new", "156 / 4", new Date()), solutionId: "new-sol" }],
    });
    get.mockImplementation(async (url: string) =>
      url === "/api/solution/new-sol"
        ? {
            data: {
              success: true,
              solution: {
                ...oldSolution("new-sol", "156 / 4"),
                createdAt: new Date().toISOString(),
                formatVersion: 2,
                content: division156,
              },
            },
          }
        : { data: { dailyCredits: { remaining: 3 } } },
    );
    await renderPage();
    fireEvent.click(btn("156 / 4"));
    await waitFor(() => expect(screen.getByRole("img", { name: "156 divided by 4" })).toBeTruthy());
  });

  it("Change to Quadratic formula solves again with method quadratic-formula", async () => {
    const withMethod = {
      ...quadratic,
      header: {
        ...quadratic.header,
        method: {
          id: "factorisation",
          label: "Factorisation",
          alternatives: [{ id: "quadratic-formula", label: "Quadratic formula" }],
        },
      },
    };
    post.mockResolvedValueOnce(v2Reply(withMethod));
    await renderPage();
    fireEvent.change(field(), { target: { value: "x^2 + 5x + 6 = 0" } });
    fireEvent.click(btn("Solve"));
    await waitFor(() => expect(btn("Change")).toBeTruthy());

    post.mockResolvedValueOnce(v2Reply(withMethod));
    fireEvent.click(btn("Change"));
    fireEvent.click(btn("Quadratic formula"));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post.mock.calls[1][1]).toMatchObject({ method: "quadratic-formula" });
  });

  it("Just a hint shows the hint from the reply and the full solution needs no second request", async () => {
    post.mockResolvedValueOnce(v2Reply({ ...division156, hint: "Start with how many 4s fit into 15." }));
    await renderPage();
    fireEvent.change(field(), { target: { value: "156 / 4" } });
    fireEvent.click(btn("Just a hint"));
    await waitFor(() => expect(screen.getByText("Start with how many 4s fit into 15.")).toBeTruthy());
    expect(screen.queryByRole("img", { name: "156 divided by 4" })).toBeNull();

    fireEvent.click(btn("Show the full solution"));
    expect(screen.getByRole("img", { name: "156 divided by 4" })).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
  });
});
