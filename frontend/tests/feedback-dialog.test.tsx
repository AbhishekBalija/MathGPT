import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { sendFeedback } = vi.hoisted(() => ({ sendFeedback: vi.fn() }));
vi.mock("../src/services/feedback.service", () => ({ sendFeedback }));

import { FeedbackDialog } from "../src/features/feedback/FeedbackDialog";

beforeEach(() => {
  sendFeedback.mockReset();
  sendFeedback.mockResolvedValue("sent");
});
afterEach(() => cleanup());

function renderDialog() {
  const onClose = vi.fn();
  render(<FeedbackDialog onClose={onClose} page="/app" solutionId="s1" />);
  return { onClose };
}

function fillIn(kind: string, message: string) {
  fireEvent.click(screen.getByRole("button", { name: kind }));
  fireEvent.change(screen.getByLabelText("What's on your mind?"), { target: { value: message } });
}

describe("FeedbackDialog", () => {
  it("sends the type, the message, the page and the open Solution, then says thanks", async () => {
    renderDialog();
    fillIn("Idea", "Add a graph of the answer");

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Thanks! We read every message.")).toBeTruthy();
    expect(sendFeedback).toHaveBeenCalledWith({
      kind: "idea",
      message: "Add a graph of the answer",
      page: "/app",
      solutionId: "s1",
    });
  });

  it("keeps Send disabled until a type is picked and a message is written", () => {
    renderDialog();
    const send = screen.getByRole("button", { name: "Send" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("What's on your mind?"), { target: { value: "   " } });
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("What's on your mind?"), { target: { value: "The page froze" } });
    expect(send.disabled).toBe(false);
  });

  it("says so when it did not send, and keeps the message", async () => {
    sendFeedback.mockResolvedValue("failed");
    renderDialog();
    fillIn("Bug", "The page froze");

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("That didn't send. Please try again.")).toBeTruthy();
    expect((screen.getByLabelText("What's on your mind?") as HTMLTextAreaElement).value).toBe("The page froze");
  });

  it("explains the hourly limit", async () => {
    sendFeedback.mockResolvedValue("rate_limited");
    renderDialog();
    fillIn("Other", "Hello");

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("You've sent a lot of feedback. Please try again in an hour.")).toBeTruthy();
  });

  it("closes with the close button", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });
});
