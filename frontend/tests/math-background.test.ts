import { createElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Landing from "../src/pages/Landing";

// Wave line colour MathBackground uses on a dark page
const DARK_WAVE_STROKE = "rgba(175, 140, 165, 0.5)";

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("Math waves on the landing page", () => {
  it("use dark-mode colours when the page first loads in dark mode", () => {
    localStorage.setItem("theme", "dark");

    const { container } = render(
      createElement(MemoryRouter, null, createElement(Landing))
    );

    const strokes = [...container.querySelectorAll("svg path[stroke]")].map(
      (path) => path.getAttribute("stroke")
    );
    expect(strokes).toContain(DARK_WAVE_STROKE);
  });
});
