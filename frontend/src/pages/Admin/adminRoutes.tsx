import { Navigate, Route } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";
import Admin from "../Admin";
import AdminShell from "./AdminShell";
import Business from "./Business";
import Events from "./Events";
import FailedSolves from "./FailedSolves";
import Feedback from "./Feedback";
import Health from "./Health";
import Overview from "./Overview";
import Reports from "./Reports";
import Settings from "./Settings";
import Students from "./Students";

/**
 * Every admin address. Each list page also takes an item id
 * (for example /admin/failed/2b91...), so a link can open one item.
 * Old addresses send you to the new ones.
 */
export function adminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      }
    >
      <Route element={<AdminShell />}>
        <Route index element={<Overview />} />
        <Route path="business" element={<Business />} />
        <Route path="health" element={<Health />} />
        <Route path="events/:id?" element={<Events />} />
        <Route path="failed/:id?" element={<FailedSolves />} />
        <Route path="reports/:id?" element={<Reports />} />
        <Route path="feedback/:id?" element={<Feedback />} />
        <Route path="students/:id?" element={<Students />} />
        <Route path="settings" element={<Settings />} />
        <Route path="errors" element={<Navigate to="/admin/failed" replace />} />
        <Route path="users" element={<Navigate to="/admin/students" replace />} />
        <Route path="analytics" element={<Navigate to="/admin/events" replace />} />
      </Route>
    </Route>
  );
}
