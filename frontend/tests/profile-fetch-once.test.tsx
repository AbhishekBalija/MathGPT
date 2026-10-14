import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api", () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import api from "../src/services/api";
import AppLayout from "../src/pages/AppLayout";
import { useAppDataStore } from "../src/stores/appDataStore";
import { useAuthStore } from "../src/stores/authStore";
import { useChatStore } from "../src/stores/chatStore";

const get = vi.mocked(api.get);

const profile = {
  user: { id: "u1", email: "a@b.co", name: "Asha", provider: "local", createdAt: new Date().toISOString() },
  stats: { totalSolutions: 0, problemTypes: {}, lastSolvedAt: null },
  dailyCredits: { used: 2, limit: 5, remaining: 3, resetsAt: new Date().toISOString() },
};

function profileCalls() {
  return get.mock.calls.filter(([url]) => url === "/api/profile").length;
}

beforeEach(() => {
  get.mockReset();
  get.mockImplementation(async (url: string) =>
    url === "/api/history" ? { data: { success: true, history: [] } } : { data: profile },
  );
  useAppDataStore.getState().clearData();
  useAuthStore.setState({ isAuthenticated: true });
  useChatStore.setState({ chats: [], activeChatId: null, historyLoaded: false });
});

afterEach(() => {
  cleanup();
});

describe("profile on app load", () => {
  it("asks for the profile once, even with StrictMode running effects twice", async () => {
    await act(async () => {
      render(
        <StrictMode>
          <MemoryRouter>
            <AppLayout />
          </MemoryRouter>
        </StrictMode>,
      );
    });
    expect(profileCalls()).toBe(1);
  });

  it("shares one request when several parts ask at the same time", async () => {
    const store = useAppDataStore.getState();
    await Promise.all([store.initializeData(), store.initializeData(), store.refreshProfile()]);
    expect(profileCalls()).toBe(1);
    expect(useAppDataStore.getState().profile?.dailyCredits?.remaining).toBe(3);
  });

  it("asks again when a refresh comes after the first answer", async () => {
    const store = useAppDataStore.getState();
    await store.initializeData();
    await store.refreshProfile();
    expect(profileCalls()).toBe(2);
  });
});
