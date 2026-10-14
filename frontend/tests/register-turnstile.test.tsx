import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registerWithEmail = vi.fn(() => Promise.resolve());

vi.mock("../src/stores/authStore", () => ({
  useAuthStore: () => ({ registerWithEmail, loginWithGoogle: vi.fn(), isLoading: false }),
}));
vi.mock("@react-oauth/google", () => ({ GoogleLogin: () => null }));
// Stands in for the Cloudflare widget: one click "passes" the check
vi.mock("@marsidev/react-turnstile", async () => {
  const { forwardRef } = await import("react");
  return {
    Turnstile: forwardRef(function FakeTurnstile(props: { onSuccess?: (token: string) => void }) {
      return (
        <button type="button" onClick={() => props.onSuccess?.("turnstile-token")}>
          Fake Turnstile
        </button>
      );
    }),
  };
});

import Register from "../src/pages/Register";

function fillForm() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Asha" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "asha@example.com" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Long-password-1!" } });
}

function renderPage() {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

describe("sign-up robot check", () => {
  beforeEach(() => registerWithEmail.mockClear());
  afterEach(() => vi.unstubAllEnvs());

  it("sends the Turnstile token with the sign-up", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key");
    renderPage();
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Fake Turnstile" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });

    expect(registerWithEmail).toHaveBeenCalledWith("asha@example.com", "Long-password-1!", "Asha", "turnstile-token");
  });

  it("asks the student to finish the check before sending", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key");
    renderPage();
    fillForm();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });

    expect(registerWithEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Please confirm you're not a robot first.");
  });

  it("shows no widget and sends no token without a site key (local development)", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    renderPage();
    fillForm();

    expect(screen.queryByRole("button", { name: "Fake Turnstile" })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(registerWithEmail).toHaveBeenCalledWith("asha@example.com", "Long-password-1!", "Asha", undefined);
  });
});
