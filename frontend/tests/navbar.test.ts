import { act, createElement, useEffect } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate, type NavigateFunction } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Navbar from "../src/components/Navbar";

// Hands the router's navigate function to the test, so it can go back and
// forward like the browser buttons
function NavigateHandle({ onReady }: { onReady: (navigate: NavigateFunction) => void }) {
  const navigate = useNavigate();
  useEffect(() => onReady(navigate), [navigate, onReady]);
  return null;
}

function menuPanel(container: HTMLElement): Element {
  const panel = container.querySelector('[class*="translate-x-"]');
  if (!panel) throw new Error("Mobile menu panel not found");
  return panel;
}

describe("Navbar mobile menu", () => {
  it("closes when the page changes, including back and forward", () => {
    let navigate: NavigateFunction = () => {};
    const { container } = render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/privacy", "/"], initialIndex: 1 },
        createElement(Navbar),
        createElement(NavigateHandle, {
          onReady: (fn: NavigateFunction) => {
            navigate = fn;
          },
        })
      )
    );

    fireEvent.click(screen.getByLabelText("Toggle Menu"));
    expect(menuPanel(container).className).toContain("translate-x-0");

    act(() => navigate(-1));
    act(() => navigate(1));

    expect(menuPanel(container).className).toContain("translate-x-full");
  });
});
