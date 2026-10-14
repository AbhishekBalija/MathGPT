import type { AdminOverview } from "../../../services/admin.service";
import { formatAdminTime } from "../shared/formatAdminTime";

// What Neo says at the top of the Overview, from the same data as the cards.
export function neoLine(overview: AdminOverview): { title: string; text: string } {
  const { status, needsYou, numbers } = overview;

  if (status.state === "down" && status.failingSince) {
    return {
      title: `Solving is failing since ${formatAdminTime(new Date(status.failingSince))}.`,
      text: "Students may be seeing errors. Check the failed solves below.",
    };
  }
  if (needsYou.length > 0) {
    const count = needsYou.length;
    return {
      title: `${count} ${count === 1 ? "thing needs" : "things need"} a look.`,
      text: `Newest: ${needsYou[0]?.title ?? ""}`,
    };
  }
  return {
    title: "Nothing needs you right now.",
    text: `${numbers.solvesToday} ${numbers.solvesToday === 1 ? "solve" : "solves"} today.`,
  };
}
