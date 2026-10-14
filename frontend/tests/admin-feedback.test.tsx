import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getFeedback, markFeedbackDone } = vi.hoisted(() => ({
  getFeedback: vi.fn(),
  markFeedbackDone: vi.fn(async () => ({ done: true })),
}));
vi.mock("../src/services/admin.service", () => ({ default: { getFeedback, markFeedbackDone } }));

import Feedback from "../src/pages/Admin/Feedback";

const idea = {
  id: "f1",
  kind: "idea",
  message: "Add a graph of the answer",
  page: "/app",
  solutionId: null,
  email: "asha@example.com",
  done: false,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  getFeedback.mockReset();
  markFeedbackDone.mockClear();
  getFeedback.mockResolvedValue({ feedback: [idea] });
});
afterEach(() => cleanup());

describe("Admin Feedback", () => {
  it("shows the type, the message and who sent it", async () => {
    render(<Feedback />);

    expect(await screen.findByText("Add a graph of the answer")).toBeTruthy();
    expect(screen.getByText("Idea")).toBeTruthy();
    expect(screen.getByText("asha@example.com")).toBeTruthy();
    expect(getFeedback).toHaveBeenCalledWith({ includeDone: false });
  });

  it("Mark done takes it off the open list", async () => {
    render(<Feedback />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark done" }));

    await waitFor(() => expect(screen.queryByText("Add a graph of the answer")).toBeNull());
    expect(markFeedbackDone).toHaveBeenCalledWith("f1");
  });

  it("can show done Feedback too", async () => {
    render(<Feedback />);
    await screen.findByText("Add a graph of the answer");

    fireEvent.click(screen.getByLabelText("Show done"));

    await waitFor(() => expect(getFeedback).toHaveBeenLastCalledWith({ includeDone: true }));
  });
});
