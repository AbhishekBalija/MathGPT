import type { AdminOverview } from "../../../services/admin.service";

// Where each kind of "Needs you" item lives in the admin
export const ITEM_PAGES: Record<AdminOverview["needsYou"][number]["kind"], { path: string; name: string }> = {
  failed: { path: "/admin/failed", name: "Failed solves" },
  report: { path: "/admin/reports", name: "Reports" },
  feedback: { path: "/admin/feedback", name: "Feedback" },
};
