import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Logo from "../src/components/brand/Logo";
import NeoMascot from "../src/components/brand/NeoMascot";

describe("Logo", () => {
  it("is announced once as NeoMath and uses the light and dark wordmarks", () => {
    const { container } = render(createElement(Logo));

    expect(screen.getAllByRole("img", { name: "NeoMath" })).toHaveLength(1);
    const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(sources).toEqual(["/brand/neomath-wordmark.svg", "/brand/neomath-wordmark-dark.svg"]);
  });
});

describe("NeoMascot", () => {
  it("is hidden from screen readers unless it has a title", () => {
    const { container, rerender } = render(createElement(NeoMascot));
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");

    rerender(createElement(NeoMascot, { title: "Neo" }));
    expect(screen.getByRole("img", { name: "Neo" })).toBeTruthy();
  });

  it("gives every Neo on the page its own gradient", () => {
    const { container } = render(
      createElement("div", null, createElement(NeoMascot), createElement(NeoMascot))
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });
});
