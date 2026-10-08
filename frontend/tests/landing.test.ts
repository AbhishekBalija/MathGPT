import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Landing from "../src/pages/Landing";

function renderLanding() {
  return render(createElement(MemoryRouter, null, createElement(Landing)));
}

describe("Landing page", () => {
  it("only promises what the solver really does", () => {
    const { container } = renderLanding();
    const text = container.textContent ?? "";

    // Steps are not checked by a symbolic engine yet, so the page must not say so
    expect(text).not.toMatch(/hallucination/i);
    expect(text).not.toMatch(/symbolic/i);
    expect(text).not.toMatch(/verified/i);
  });

  it("leads with the student's problem and names who built it", () => {
    const { container } = renderLanding();

    expect(
      screen.getByRole("heading", { level: 1 }).textContent
    ).toContain("Stuck on a problem?");
    expect(container.querySelector("footer")?.textContent).toContain(
      "Built by Abhishek Balija"
    );
  });
});
