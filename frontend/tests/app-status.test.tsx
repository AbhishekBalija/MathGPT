import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const status = vi.hoisted(() => ({ value: { maintenance: { on: false, message: "" }, signupsOpen: true } }));
vi.mock("../src/stores/appStatusStore", () => ({
  useAppStatus: () => ({ status: status.value, load: vi.fn() }),
}));
vi.mock("../src/stores/authStore", () => ({
  useAuthStore: () => ({ registerWithEmail: vi.fn(), loginWithGoogle: vi.fn(), isLoading: false }),
}));
vi.mock("@react-oauth/google", () => ({ GoogleLogin: () => null }));

import { Composer } from "../src/features/solver/composer/Composer";
import Register from "../src/pages/Register";

afterEach(() => cleanup());

describe("maintenance mode in the student app", () => {
  it("shows the admin's message in place of the Solve button", () => {
    render(<Composer value="2x = 4" onChange={() => {}} onSolve={() => {}} pausedMessage="Back at 6 pm." />);

    expect(screen.getByText("Back at 6 pm.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /solve/i })).toBeNull();
  });
});

describe("the free problems line", () => {
  it("uses the real daily limit", () => {
    render(<Composer value="" onChange={() => {}} onSolve={() => {}} remaining={2} limit={6} />);
    expect(screen.getByText("2 of 6 free problems left today")).toBeTruthy();
  });

  it("says an admin has no limit", () => {
    render(<Composer value="" onChange={() => {}} onSolve={() => {}} remaining={null} limit={null} />);
    expect(screen.getByText("No daily limit (admin)")).toBeTruthy();
  });
});

describe("paused sign-ups", () => {
  it("tells people on the sign-up page and turns the button off", () => {
    status.value = { maintenance: { on: false, message: "" }, signupsOpen: false };
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByText("New sign-ups are paused for now. If you already have an account, log in.")).toBeTruthy();
    const submit = screen.getAllByRole("button").find((button) => (button as HTMLButtonElement).type === "submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});
