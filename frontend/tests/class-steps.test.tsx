import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassSteps } from "../src/features/onboarding/ClassSteps";
import { classService } from "../src/services/class.service";
import type { User } from "../src/services/auth.service";

vi.mock("../src/services/class.service", () => ({
  classService: { save: vi.fn(), skip: vi.fn() },
}));

const savedUser: User = { id: "u1", email: "asha@example.com", name: "Asha", onboarding: "done" };

beforeEach(() => {
  vi.mocked(classService.save).mockReset().mockResolvedValue(savedUser);
  vi.mocked(classService.skip).mockReset().mockResolvedValue(savedUser);
});

function pick(name: string) {
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(name) }));
}

describe("ClassSteps", () => {
  it("keeps Continue disabled until a class is picked", () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    const next = screen.getByRole("button", { name: "Continue" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    pick("Class 6–8");
    expect((next as HTMLButtonElement).disabled).toBe(false);
  });

  it("leads a school class to the board chips, and State board shows the state list", async () => {
    const onSaved = vi.fn();
    render(<ClassSteps onSaved={onSaved} />);
    pick("Class 9–10");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Which board is your school?" })).toBeTruthy();
    pick("State board");
    const state = screen.getByLabelText("Which state?") as HTMLSelectElement;
    expect(state.options[0]?.textContent).toBe("Karnataka");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedUser));
    expect(classService.save).toHaveBeenCalledWith({
      range: "class_9_10",
      helping: false,
      board: "state",
      state: "Karnataka",
    });
  });

  it("leads College to the university box, and Done saves with it empty", async () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    pick("College & above");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByLabelText("University or college")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(classService.save).toHaveBeenCalledWith({ range: "college", helping: false }));
  });

  it("changes the question for a parent or teacher and saves helping", async () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "I'm a parent or teacher" }));
    expect(screen.getByRole("heading", { name: "Which class are you helping with?" })).toBeTruthy();

    pick("Class 1–5");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    pick("CBSE");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(classService.save).toHaveBeenCalledWith({ range: "class_1_5", helping: true, board: "cbse" })
    );
  });

  it("skips on the class step", async () => {
    const onSkip = vi.fn();
    render(<ClassSteps onSaved={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(onSkip).toHaveBeenCalledWith(savedUser));
    expect(classService.save).not.toHaveBeenCalled();
  });

  it("saves the class without a board when the board step is skipped", async () => {
    const onSaved = vi.fn();
    render(<ClassSteps onSaved={onSaved} onSkip={vi.fn()} />);
    pick("Class 1–5");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedUser));
    expect(classService.save).toHaveBeenCalledWith({ range: "class_1_5", helping: false });
    expect(classService.skip).not.toHaveBeenCalled();
  });

  it("starts from the saved answer when given one", () => {
    render(
      <ClassSteps
        onSaved={vi.fn()}
        initial={{ range: "class_6_8", helping: false, board: "cbse", state: null, institution: null }}
      />
    );
    expect((screen.getByRole("radio", { name: /Class 6–8/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByRole("radio", { name: "CBSE" }) as HTMLInputElement).checked).toBe(true);
  });

  it("goes back from the board step to the class step", () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    pick("Class 6–8");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Which class are you in?" })).toBeTruthy();
  });
});
