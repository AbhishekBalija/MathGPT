import type { AdminHealth } from "../../../services/admin.service";
import type { NeoState } from "../shared/NeoStatus";
import { SERVICES } from "./runbooks";

// Neo's line: a service that is down wins, then anything that needs a look
export function healthLine(health: AdminHealth): { state: NeoState; title: string; text: string } {
  const down = health.services.filter((service) => service.status === "down");
  if (down.length > 0) {
    return {
      state: "down",
      title: `${down.map((service) => SERVICES[service.id].name).join(", ")} ${down.length === 1 ? "is" : "are"} down.`,
      text: "Open the row below for what to do.",
    };
  }
  const missing = health.services.filter((service) => service.status === "key_missing");
  if (missing.length > 0 || health.solving.failed24h > 0) {
    return {
      state: "attention",
      title: health.solving.failed24h > 0 ? `${health.solving.failed24h} failed in the last 24 hours.` : "A key is missing.",
      text: missing.length > 0 ? `${missing.map((service) => SERVICES[service.id].name).join(", ")}: key missing.` : "Every service is up.",
    };
  }
  return { state: "fine", title: "Everything is up.", text: "Nothing failed in the last 24 hours." };
}
