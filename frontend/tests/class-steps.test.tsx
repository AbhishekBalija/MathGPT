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

// Radios: roles, single classes and board chips
function pick(name: string | RegExp) {
  fireEvent.click(screen.getByRole("radio", { name }));
}
function tick(name: RegExp) {
  fireEvent.click(screen.getByRole("checkbox", { name }));
}
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const heading = (name: string) => screen.getByRole("heading", { name });

// A role row's name includes its line ("Student I'm learning math")
function asRole(role: "Student" | "Parent" | "Teacher") {
  pick(new RegExp(`^${role}`));
  press("Continue");
}

describe("ClassSteps", () => {
  it("starts with who is using NeoMath, and Continue waits for a pick", () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    expect(heading("Who's using NeoMath?")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    pick(/^Student/);
    expect(next.disabled).toBe(false);
  });

  it("asks a student one class, then the board, and saves it", async () => {
    const onSaved = vi.fn();
    render(<ClassSteps onSaved={onSaved} />);
    asRole("Student");

    expect(heading("Which class are you in?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Class 6–8/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Class 9–10/ }));
    press("Continue");

    expect(heading("Which board is your school?")).toBeInTheDocument();
    pick("State board");
    expect((screen.getByLabelText("Which state?") as HTMLSelectElement).options[0]?.textContent).toBe("Karnataka");
    press("Done");

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedUser));
    expect(classService.save).toHaveBeenCalledWith({
      role: "student",
      ranges: ["class_9_10"],
      board: "state",
      state: "Karnataka",
    });
  });

  it("asks a parent about their child", async () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    asRole("Parent");
    expect(heading("Which class is your child in?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Class 1–5/ }));
    press("Continue");
    expect(heading("Which board is their school?")).toBeInTheDocument();
    pick("CBSE");
    press("Done");
    await waitFor(() =>
      expect(classService.save).toHaveBeenCalledWith({ role: "parent", ranges: ["class_1_5"], board: "cbse" })
    );
  });

  it("lets a teacher pick several classes", async () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    asRole("Teacher");
    expect(heading("Which classes do you teach?")).toBeInTheDocument();
    tick(/Class 6–8/);
    tick(/Class 9–10/);
    expect((screen.getByRole("checkbox", { name: /Class 6–8/ }) as HTMLInputElement).checked).toBe(true);
    press("Continue");
    pick("CBSE");
    press("Done");
    await waitFor(() =>
      expect(classService.save).toHaveBeenCalledWith({ role: "teacher", ranges: ["class_6_8", "class_9_10"], board: "cbse" })
    );
  });

  it("asks only for the university when College is the only class", async () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    asRole("Student");
    fireEvent.click(screen.getByRole("radio", { name: /College & above/ }));
    press("Continue");
    expect(heading("Which university or college?")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "CBSE" })).toBeNull();
    press("Done");
    await waitFor(() => expect(classService.save).toHaveBeenCalledWith({ role: "student", ranges: ["college"] }));
  });

  it("asks a teacher with school and college for both", async () => {
    render(<ClassSteps onSaved={vi.fn()} />);
    asRole("Teacher");
    tick(/Class 11–12/);
    tick(/College & above/);
    press("Continue");
    expect(heading("Where do you teach?")).toBeInTheDocument();
    pick("CBSE");
    fireEvent.change(screen.getByLabelText("University or college"), { target: { value: "VTU" } });
    press("Done");
    await waitFor(() =>
      expect(classService.save).toHaveBeenCalledWith({
        role: "teacher",
        ranges: ["class_11_12", "college"],
        board: "cbse",
        institution: "VTU",
      })
    );
  });

  it("skips everything on the role step", async () => {
    const onSkip = vi.fn();
    render(<ClassSteps onSaved={vi.fn()} onSkip={onSkip} />);
    press("Skip");
    await waitFor(() => expect(onSkip).toHaveBeenCalledWith(savedUser));
    expect(classService.save).not.toHaveBeenCalled();
  });

  it("still lets the student go when skipping fails", async () => {
    vi.mocked(classService.skip).mockRejectedValue(new Error("offline"));
    const onSkip = vi.fn();
    render(<ClassSteps onSaved={vi.fn()} onSkip={onSkip} />);
    press("Skip");
    await waitFor(() => expect(onSkip).toHaveBeenCalledWith(null));
  });

  it("keeps the role when the class step is skipped", async () => {
    const onSaved = vi.fn();
    render(<ClassSteps onSaved={onSaved} onSkip={vi.fn()} />);
    asRole("Parent");
    press("Skip");
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedUser));
    expect(classService.save).toHaveBeenCalledWith({ role: "parent" });
  });

  it("keeps the role and class when the board step is skipped", async () => {
    render(<ClassSteps onSaved={vi.fn()} onSkip={vi.fn()} />);
    asRole("Student");
    fireEvent.click(screen.getByRole("radio", { name: /Class 1–5/ }));
    press("Continue");
    press("Skip");
    await waitFor(() => expect(classService.save).toHaveBeenCalledWith({ role: "student", ranges: ["class_1_5"] }));
    expect(classService.skip).not.toHaveBeenCalled();
  });

  it("starts from a saved answer", () => {
    render(
      <ClassSteps
        onSaved={vi.fn()}
        initial={{ role: "teacher", ranges: ["class_6_8", "class_9_10"], board: "cbse", state: null, institution: null }}
      />
    );
    expect((screen.getByRole("radio", { name: /Teacher/ }) as HTMLInputElement).checked).toBe(true);
    press("Continue");
    expect((screen.getByRole("checkbox", { name: /Class 9–10/ }) as HTMLInputElement).checked).toBe(true);
    press("Continue");
    expect((screen.getByRole("radio", { name: "CBSE" }) as HTMLInputElement).checked).toBe(true);
  });

  it("goes back one step at a time", () => {
    const onBackFromFirst = vi.fn();
    render(<ClassSteps onSaved={vi.fn()} onBackFromFirst={onBackFromFirst} />);
    asRole("Student");
    fireEvent.click(screen.getByRole("radio", { name: /Class 6–8/ }));
    press("Continue");
    press("Back");
    expect(heading("Which class are you in?")).toBeInTheDocument();
    press("Back");
    expect(heading("Who's using NeoMath?")).toBeInTheDocument();
    press("Back");
    expect(onBackFromFirst).toHaveBeenCalled();
  });
});
