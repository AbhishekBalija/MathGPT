import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import GoogleAuthProvider from "../src/components/GoogleAuthProvider";
import Login from "../src/pages/Login";
import Register from "../src/pages/Register";

// The real Google library: without a client id its button throws, which used
// to blank the whole page in local development
function renderPage(page: "login" | "register") {
  return render(
    <GoogleAuthProvider>
      <MemoryRouter>{page === "login" ? <Login /> : <Register />}</MemoryRouter>
    </GoogleAuthProvider>
  );
}

describe("sign-in pages without a Google client id", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["login", "register"] as const)("the %s page still shows the email form", (page) => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    renderPage(page);

    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.queryByText("or")).toBeNull();
  });
});
