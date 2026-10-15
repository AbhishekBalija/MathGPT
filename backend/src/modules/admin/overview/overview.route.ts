/**
 * GET /admin/overview - everything on the admin Overview in one call:
 * Neo's state, the key numbers, solves per day, today's AI usage, what
 * needs the admin, and the business funnel (real students only).
 * Mounted behind requireUser and requireAdmin.
 */

import { route } from "../../../lib/http";
import { geminiResetAt, istDay } from "./ist";
import { overviewRepository } from "./overview.repository";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEEDS_YOU = 8;
const TOP_TOPICS = 6;

// Optional until the Settings screen exists: the daily AI calls the owner allows
function dailyLimit(): number | null {
  const limit = Number(process.env.AI_DAILY_LIMIT);
  return Number.isInteger(limit) && limit > 0 ? limit : null;
}

export const adminOverviewRoute = route(async () => {
  const now = new Date();
  const [numbers, byDay, sources, tokens, needsYou, funnel, topTopics, alert] = await Promise.all([
    overviewRepository.numbers(),
    overviewRepository.solvesByDay(),
    overviewRepository.solveSourcesToday(),
    overviewRepository.tokens(),
    overviewRepository.needsYou(NEEDS_YOU),
    overviewRepository.funnel(),
    overviewRepository.topTopics(TOP_TOPICS),
    overviewRepository.solvingAlert(),
  ]);

  // The last 7 India days, oldest first, with zeros for days without solves
  const solvesPerDay = Array.from({ length: 7 }, (_, index) => {
    const day = istDay(new Date(now.getTime() - (6 - index) * DAY_MS));
    return { day, count: byDay.get(day) ?? 0 };
  });

  // The primary model is the one that wrote most AI answers today; any other is the backup
  const aiSources = sources.filter((entry) => entry.source === "ai");
  const primary = [...aiSources].sort((a, b) => b.count - a.count)[0]?.model ?? null;
  const countOf = (source: string) => sources.filter((entry) => entry.source === source).reduce((sum, entry) => sum + entry.count, 0);
  const backup = aiSources.filter((entry) => entry.model && entry.model !== primary).reduce((sum, entry) => sum + entry.count, 0);

  const failing = alert?.status === "failing";
  const state = failing ? "down" : needsYou.length > 0 ? "attention" : "fine";

  return {
    status: 200,
    body: {
      status: { state, failingSince: failing ? alert.changedAt.toISOString() : null },
      numbers,
      solvesPerDay,
      aiUsage: {
        ai: countOf("ai") - backup,
        backup,
        cache: countOf("cache"),
        instant: countOf("instant"),
        tokensToday: tokens.today,
        avgTokensPerSolve: tokens.avgPerSolve,
        limit: dailyLimit(),
        resetsAt: geminiResetAt(now).toISOString(),
      },
      needsYou,
      funnel,
      topTopics,
    },
  };
});
