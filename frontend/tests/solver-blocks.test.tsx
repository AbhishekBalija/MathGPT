import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlockView } from "../src/features/solver/blocks/BlockView";
import type { Block } from "../src/features/solver/model/solution";

describe("BlockView", () => {
  it("renders an equation inside a sideways-scrolling wrapper", () => {
    const { container } = render(<BlockView block={{ type: "equation", latex: "x^2" }} />);
    expect(container.querySelector(".overflow-x-auto .katex")).toBeTruthy();
  });
  it("shows invalid LaTeX as text instead of crashing", () => {
    render(<BlockView block={{ type: "equation", latex: "\\frac{1" }} />);
    expect(document.body.textContent).toContain("frac");
  });
  it("falls back to text for an unknown block type", () => {
    render(<BlockView block={{ type: "graph" } as unknown as Block} />);
    expect(screen.getByText("This step could not be shown.")).toBeTruthy();
  });
  it("draws 156 ÷ 4 with 12 under 15", () => {
    const { container } = render(
      <BlockView block={{ type: "longDivision", dividend: 156, divisor: 4 }} />,
    );
    const cell = container.querySelector('[data-row="0"][data-col="1"]');
    expect(cell?.textContent).toBe("2");
    expect(container.querySelector('[data-row="q"][data-col="2"]')?.textContent).toBe("9");
    expect(container.querySelector('[data-row="n"][data-col="0"]')?.textContent).toBe("1");
  });
  it("renders statement and reason rows", () => {
    render(
      <BlockView
        block={{ type: "statementReason", rows: [{ statement: "AB = AC", reason: "Given" }] }}
      />,
    );
    expect(screen.getByText("Given")).toBeTruthy();
  });
  it("renders inline math in text", () => {
    const { container } = render(
      <BlockView block={{ type: "text", text: "Let speed be $x$ km/h" }} />,
    );
    expect(container.querySelectorAll(".katex")).toHaveLength(1);
  });
  it("renders a table", () => {
    render(<BlockView block={{ type: "table", headers: ["x"], rows: [["1"]] }} />);
    expect(screen.getByText("x")).toBeTruthy();
  });
  it("shows carries above the next column in 478 + 256", () => {
    const { container } = render(
      <BlockView block={{ type: "columnArithmetic", op: "+", operands: [478, 256] }} />,
    );
    expect(container.querySelector('[data-row="carry"][data-col="1"]')?.textContent).toBe("1");
    expect(container.querySelector('[data-row="result"][data-col="0"]')?.textContent).toBe("7");
  });
  it("shows a chain of borrows in 302 - 18", () => {
    const { container } = render(
      <BlockView block={{ type: "columnArithmetic", op: "-", operands: [302, 18] }} />,
    );
    const borrow = (c: number) =>
      container.querySelector(`[data-row="borrow"][data-col="${c}"]`)?.textContent;
    // 3 lends one, 0 receives and lends (10 - 1 = 9), 2 receives (12)
    expect([borrow(0), borrow(1), borrow(2)]).toEqual(["2", "9", "12"]);
    expect(container.querySelector('[data-row="result"][data-col="2"]')?.textContent).toBe("4");
  });
});
