import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("renders inline math inside table cells and statement rows", () => {
    const { container } = render(
      <BlockView block={{ type: "table", headers: ["Item"], rows: [["Total $x+1$ apples"]] }} />,
    );
    expect(container.querySelectorAll(".katex")).toHaveLength(1);
    expect(container.textContent).toContain("Total");
    expect(container.querySelector("td p")).toBeNull();
    render(
      <BlockView
        block={{ type: "statementReason", rows: [{ statement: "Side $AB$ is equal", reason: "Given" }] }}
      />,
    );
    expect(screen.getByText(/is equal/)).toBeTruthy();
  });
  it("shows the fallback for bad numbers instead of crashing", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<BlockView block={{ type: "longDivision", dividend: 5, divisor: 0 }} />);
    render(<BlockView block={{ type: "columnArithmetic", op: "-", operands: [3] }} />);
    expect(screen.getAllByText("This step could not be shown.")).toHaveLength(2);
    quiet.mockRestore();
  });
  it("keeps a long divisor in its own cell", () => {
    const { container } = render(
      <BlockView block={{ type: "longDivision", dividend: 1234, divisor: 123 }} />,
    );
    expect(container.querySelector('[data-row="n"][data-col="divisor"]')?.textContent).toBe("123");
  });
  it("keeps the zero subtract row in 412 ÷ 4", () => {
    const { container } = render(
      <BlockView block={{ type: "longDivision", dividend: 412, divisor: 4 }} />,
    );
    const zeroCells = [...container.querySelectorAll("[data-row]:not([data-row='q']):not([data-row='n'])")];
    expect(zeroCells.some((el) => el.textContent === "0")).toBe(true);
  });
  it("shows HTML in text literally", () => {
    const { container } = render(<BlockView block={{ type: "text", text: "<b>hi</b>" }} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toBe("<b>hi</b>");
  });
  it("labels the grids for screen readers", () => {
    render(<BlockView block={{ type: "longDivision", dividend: 156, divisor: 4 }} />);
    render(<BlockView block={{ type: "columnArithmetic", op: "-", operands: [302, 18] }} />);
    render(<BlockView block={{ type: "columnArithmetic", op: "+", operands: [45, 27] }} />);
    expect(screen.getByLabelText("156 divided by 4")).toBeTruthy();
    expect(screen.getByLabelText("302 minus 18")).toBeTruthy();
    expect(screen.getByLabelText("45 plus 27")).toBeTruthy();
  });
});
