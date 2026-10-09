import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "../src/features/solver/composer/Composer";
import { SlimComposer } from "../src/features/solver/composer/SlimComposer";

function Harness(props: { initial?: string; onSolve?: (p: string, v: "all" | "hint") => void; remaining?: number; disabled?: boolean }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <Composer value={value} onChange={setValue} onSolve={props.onSolve ?? (() => {})} remaining={props.remaining} disabled={props.disabled} />
  );
}
const field = () => screen.getByLabelText("Your math problem") as HTMLTextAreaElement;

describe("Composer", () => {
  it("shows how the input was read before solving", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector(".katex")).toBeNull();
    fireEvent.change(field(), { target: { value: "x^2+5x+6=0" } });
    expect(screen.getByText("Read as")).toBeTruthy();
    expect(container.querySelector(".katex")).toBeTruthy();
  });
  it("shows symbols like plus-minus, alpha and infinity through KaTeX", () => {
    const { container } = render(<Harness initial="a±b" />);
    expect(container.querySelector(".katex")?.textContent).toContain("±");
    const outside = container.cloneNode(true) as HTMLElement;
    outside.querySelectorAll(".katex").forEach((n) => n.remove());
    expect(outside.querySelector("p")?.textContent).not.toContain("±");
    fireEvent.change(field(), { target: { value: "α+∞" } });
    const text = container.querySelector(".katex")?.textContent ?? "";
    expect(text).toContain("α");
    expect(text).toContain("∞");
  });
  it("shows no Read as for plain words", () => {
    render(<Harness initial="hello" />);
    expect(screen.queryByText("Read as")).toBeNull();
  });
  it("solves on Enter and adds a line on Shift+Enter", () => {
    const onSolve = vi.fn();
    render(<Harness initial="  x^2+5x+6=0 " onSolve={onSolve} />);
    fireEvent.keyDown(field(), { key: "Enter", shiftKey: true });
    expect(onSolve).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onSolve).toHaveBeenCalledTimes(1);
    expect(onSolve).toHaveBeenCalledWith("x^2+5x+6=0", "all");
  });
  it("does not solve on Enter while an IME is composing", () => {
    const onSolve = vi.fn();
    render(<Harness initial="x" onSolve={onSolve} />);
    fireEvent.keyDown(field(), { key: "Enter", isComposing: true });
    expect(onSolve).not.toHaveBeenCalled();
  });
  it("asks for a hint with Just a hint", () => {
    const onSolve = vi.fn();
    render(<Harness initial="x^2+5x+6=0" onSolve={onSolve} />);
    fireEvent.click(screen.getByRole("button", { name: "Just a hint" }));
    expect(onSolve).toHaveBeenCalledWith("x^2+5x+6=0", "hint");
  });
  it("disables Solve and hint for whitespace or when disabled", () => {
    const { unmount } = render(<Harness initial="   " />);
    expect((screen.getByRole("button", { name: "Solve" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Just a hint" }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    render(<Harness initial="x" disabled />);
    expect((screen.getByRole("button", { name: "Solve" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("inserts a keypad symbol at the cursor and keeps focus in the field", async () => {
    render(<Harness initial="2ab" />);
    const toggle = screen.getByRole("button", { name: "Show math keypad" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    field().focus();
    field().setSelectionRange(1, 1);
    fireEvent.click(screen.getByRole("button", { name: "√" }));
    expect(field().value).toBe("2√ab");
    await vi.waitFor(() => expect(document.activeElement).toBe(field()));
    field().setSelectionRange(4, 4);
    fireEvent.click(screen.getByRole("button", { name: "x²" }));
    expect(field().value).toBe("2√ab^2");
  });
  it("keeps the camera button disabled", () => {
    render(<Harness />);
    const camera = screen.getByTitle("Photo input is coming soon");
    expect(camera.getAttribute("aria-disabled")).toBe("true");
  });
  it("shows today's remaining free problems", () => {
    const { rerender } = render(<Harness remaining={3} />);
    expect(screen.getByText("3 of 5 free problems left today")).toBeTruthy();
    rerender(<Harness remaining={1} />);
    expect(screen.getByText("1 of 5 free problems left today")).toBeTruthy();
    rerender(<Harness remaining={0} />);
    expect(screen.getByText("No free problems left today. Come back tomorrow.")).toBeTruthy();
  });
  it("hides the free problems line when the count is unknown", () => {
    render(<Harness />);
    expect(screen.queryByText(/free problems/)).toBeNull();
  });
});

describe("SlimComposer", () => {
  it("opens the input and starts a new problem", () => {
    const onOpen = vi.fn();
    const onNew = vi.fn();
    render(<SlimComposer onOpen={onOpen} onNew={onNew} />);
    fireEvent.click(screen.getByRole("button", { name: "Ask another problem" }));
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});
