import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getSettings, updateSettings } = vi.hoisted(() => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));
vi.mock("../src/services/admin.service", () => ({ default: { getSettings, updateSettings } }));
vi.mock("../src/stores/authStore", () => ({ useAuthStore: () => ({ user: { id: "me", name: "Abhishek" } }) }));

import Settings from "../src/pages/Admin/Settings";

const MESSAGE = "Neo is taking a short break to get better. Please try again in a little while.";

function response(overrides: Record<string, unknown> = {}, changes: unknown[] = []) {
  return { settings: { dailyLimit: 5, signupsOpen: true, maintenance: { on: false, message: MESSAGE }, ...overrides }, changes };
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getSettings.mockReset();
  updateSettings.mockReset();
  getSettings.mockResolvedValue(response());
  updateSettings.mockImplementation(async (change: Record<string, unknown>) => response(change));
});
afterEach(() => cleanup());

describe("admin Settings", () => {
  it("saves a new daily limit, and Undo puts the old one back before saving", async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole("button", { name: "One more free problem" }));
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("Changed from 5 to 6, not saved yet")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("5")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "One more free problem" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ dailyLimit: 6 }));
  });

  it("never goes below 1 or above 50", async () => {
    getSettings.mockResolvedValue(response({ dailyLimit: 1 }));
    renderSettings();
    const fewer = await screen.findByRole("button", { name: "One less free problem" });
    expect((fewer as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks before turning maintenance on, and sends nothing until you confirm", async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole("switch", { name: "Maintenance mode" }));

    expect(screen.getByText("Turn on maintenance mode? Students can't solve until you turn it off.")).toBeTruthy();
    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, pause solving" }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ maintenance: { on: true, message: MESSAGE } }));
  });

  it("can't confirm maintenance with an empty message", async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole("switch", { name: "Maintenance mode" }));

    fireEvent.change(screen.getByLabelText(/What students see/), { target: { value: "   " } });

    expect(screen.queryByRole("button", { name: "Yes, pause solving" })).toBeNull();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("turns maintenance off at once", async () => {
    getSettings.mockResolvedValue(response({ maintenance: { on: true, message: "Back at 6 pm." } }));
    renderSettings();

    fireEvent.click(await screen.findByRole("switch", { name: "Maintenance mode" }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ maintenance: { on: false, message: "Back at 6 pm." } }));
  });

  it("asks before pausing sign-ups", async () => {
    renderSettings();
    fireEvent.click(await screen.findByRole("switch", { name: "New sign-ups" }));

    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, pause sign-ups" }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ signupsOpen: false }));
  });

  it("shows who changed what, with 'You' for you", async () => {
    getSettings.mockResolvedValue(
      response({ dailyLimit: 6 }, [
        { id: "c1", key: "dailyLimit", oldValue: 5, newValue: 6, changedAt: new Date().toISOString(), by: { id: "me", name: "Abhishek" } },
        { id: "c2", key: "signupsOpen", oldValue: true, newValue: false, changedAt: new Date().toISOString(), by: { id: "other", name: "Asha" } },
      ]),
    );
    renderSettings();

    const log = await screen.findByRole("list", { name: "Changes" });
    expect(within(log).getByText(/You changed free problems per day from 5 to 6/)).toBeTruthy();
    expect(within(log).getByText(/Asha paused new sign-ups/)).toBeTruthy();
  });
});
