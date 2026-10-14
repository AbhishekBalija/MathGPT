import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getCounts } = vi.hoisted(() => ({ getCounts: vi.fn() }));
// The pages inside the shell load their own data; here it never arrives
vi.mock("../src/services/admin.service", () => {
  const service = new Proxy(
    {},
    { get: (_target, name) => (name === "getCounts" ? getCounts : () => new Promise(() => {})) },
  );
  return { default: service, adminService: service };
});

import { adminRoutes } from "../src/pages/Admin/adminRoutes";
import { useAuthStore } from "../src/stores/authStore";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{adminRoutes()}</Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getCounts.mockReset();
  getCounts.mockResolvedValue({ failedOpen: 5, reportsBlocked: 1, feedbackOpen: 0 });
  useAuthStore.setState({
    isAuthenticated: true,
    user: { id: "a1", email: "owner@example.com", name: "Owner", isAdmin: true, role: "admin" },
  } as Partial<ReturnType<typeof useAuthStore.getState>>);
});
afterEach(() => cleanup());

describe("admin shell", () => {
  it("groups the nav and shows how many failed problems are open", async () => {
    renderAt("/admin");

    for (const group of ["Watch", "Handle", "People"]) {
      expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    }
    const failed = await screen.findByRole("link", { name: /Failed solves.*5/ });
    expect(failed.getAttribute("href")).toBe("/admin/failed");
    expect(screen.getByRole("link", { name: /Reports.*1/ }).getAttribute("href")).toBe("/admin/reports");
  });

  it.each([
    ["/admin/errors", /Failed solves/],
    ["/admin/users", /Students/],
    ["/admin/analytics", /Events/],
  ])("sends the old address %s to its new page", async (oldPath, newLink) => {
    renderAt(oldPath);

    const link = await screen.findByRole("link", { name: newLink });
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("opens an item from its own address", async () => {
    renderAt("/admin/failed/2b91a7c0-0000-4000-8000-000000000000");

    const link = await screen.findByRole("link", { name: /Failed solves/ });
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});
