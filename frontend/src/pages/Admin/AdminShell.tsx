import { Outlet } from "react-router-dom";
import AdminNav from "./AdminNav";

// Every admin page: the nav on the left (a row across the top on phones), the page beside it.
export default function AdminShell() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0a0a0a] dark:text-gray-50 md:grid md:grid-cols-[232px_1fr]">
      <AdminNav />
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
