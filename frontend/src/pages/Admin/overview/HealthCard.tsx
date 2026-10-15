import { Link } from "react-router-dom";
import type { AdminHealth } from "../../../services/admin.service";
import { SERVICES } from "../health/runbooks";
import { Card } from "./cards";
import { MUTED } from "./styles";

const DOTS: Record<AdminHealth["services"][number]["status"], string> = {
  up: "bg-emerald-600 dark:bg-emerald-400",
  key_set: "bg-emerald-600 dark:bg-emerald-400",
  down: "bg-red-600 dark:bg-red-400",
  key_missing: "bg-amber-600 dark:bg-amber-400",
};

// A short version of the Health screen for the Overview
export function HealthCard({ health, failed }: { health: AdminHealth | null; failed: boolean }) {
  return (
    <Card title="Health" note={health ? `${health.solving.failed24h} of ${health.solving.tries24h} tries failed in 24h` : undefined}>
      {health ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 pb-2 text-sm">
          {health.services.map((service) => (
            <li key={service.id} className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-2 rounded-full ${DOTS[service.status]}`} />
              {SERVICES[service.id].name}
              {service.status === "down" ? <span className="text-xs text-red-600 dark:text-red-400">down</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`px-4 pb-2 text-sm ${MUTED}`}>{failed ? "Couldn't check services." : "Checking..."}</p>
      )}
      <Link to="/admin/health" className="mx-4 mb-4 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline">
        Open Health
      </Link>
    </Card>
  );
}
