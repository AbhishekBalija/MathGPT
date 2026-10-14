import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registerWithEmail = vi.fn(() => Promise.resolve());

vi.mock("../src/stores/authStore", () => ({
  useAuthStore: () => ({ registerWithEmail, loginWithGoogle: vi.fn(), isLoading: false }),
}));
vi.mock("@react-oauth/google", () => ({ GoogleLogin: () => null }));

import Register from "../src/pages/Register";
import { PASSWORD_RULES, unmetPasswordRules } from "../src/utils/passwordRules";

function renderPage() {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

function typePassword(value: string) {
  fireEvent.change(screen.getByLabelText("Password"), { target: { value } });
}

// Each rule is a list item that says whether it is done yet
function ruleItem(label: string) {
  const item = screen.getByText(label).closest("li");
  if (!item) throw new Error(`No rule "${label}"`);
  return item;
}

describe("password rules on sign-up", () => {
  beforeEach(() => registerWithEmail.mockClear());
  afterEach(() => cleanup());

  it("shows every rule under the field before anything is typed", () => {
    renderPage();
    for (const rule of PASSWORD_RULES) {
      expect(ruleItem(rule.label).dataset.done).toBe("false");
    }
  });

  it("marks each rule done as the password meets it", () => {
    renderPage();
    typePassword("abc");
    expect(ruleItem("A small letter (a-z)").dataset.done).toBe("true");
    expect(ruleItem("A capital letter (A-Z)").dataset.done).toBe("false");

    typePassword("Abcdefg1!");
    for (const rule of PASSWORD_RULES) {
      expect(ruleItem(rule.label).dataset.done).toBe("true");
    }
  });

  it("does not send a password that misses a rule", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "asha@example.com" } });
    typePassword("abcdefgh1!");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(registerWithEmail).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("a capital letter");
  });

  it("matches the server's rules", () => {
    expect(unmetPasswordRules("Abcdefg1!")).toEqual([]);
    expect(unmetPasswordRules("Abcdef1!")).toEqual([]);
    expect(unmetPasswordRules("Abcde1!").map((r) => r.id)).toEqual(["length"]);
    // The server only counts these symbols, not - or _
    expect(unmetPasswordRules("Abcdefg1-").map((r) => r.id)).toEqual(["symbol"]);
    expect(unmetPasswordRules("").map((r) => r.id)).toEqual(["length", "upper", "lower", "number", "symbol"]);
  });
});
