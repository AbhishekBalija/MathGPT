/**
 * GET /admin/business - real students, how many come back, what they ask
 * and what it costs. Team accounts are left out unless ?includeTeam=true.
 * Mounted behind requireUser and requireAdmin.
 */

import { queryParam, route } from "../../../lib/http";
import { emptyRate, istDay, istWeekStart } from "../overview/ist";
import { businessRepository } from "./business.repository";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const COHORT_WEEKS = 6;
const TOP_TOPICS = 5;

export const adminBusinessRoute = route(async (req) => {
  const includeTeam = queryParam(req, "includeTeam") === "true";
  const now = new Date();
  // Monday of this India week, then the 5 before it
  const weekStarts = Array.from({ length: COHORT_WEEKS }, (_, index) => istWeekStart(new Date(now.getTime() - index * WEEK_MS)));

  const [numbers, newByDay, funnel, cohorts, cost, topics] = await Promise.all([
    businessRepository.numbers(includeTeam),
    businessRepository.newByDay(includeTeam),
    businessRepository.funnel(includeTeam),
    businessRepository.cohorts(includeTeam, weekStarts.at(-1) ?? istWeekStart(now)),
    businessRepository.cost(),
    businessRepository.topics(includeTeam, TOP_TOPICS),
  ]);

  return {
    status: 200,
    body: {
      numbers: {
        students: numbers.students,
        activeThisWeek: numbers.activeThisWeek,
        activeRate: emptyRate(numbers.activeThisWeek, numbers.students),
        // One decimal, and 0 when no one was active
        solvesPerActive: numbers.activeThisWeek === 0 ? 0 : Math.round((numbers.solvesThisWeek / numbers.activeThisWeek) * 10) / 10,
        limitHits: numbers.limitHits,
      },
      // The last 7 India days, oldest first
      newPerDay: Array.from({ length: 7 }, (_, index) => {
        const day = istDay(new Date(now.getTime() - (6 - index) * DAY_MS));
        return { day, count: newByDay.get(day) ?? 0 };
      }),
      funnel,
      // Newest first. weeks[0] is the signup week (100%), then each week since, up to this one.
      cohorts: weekStarts.map((weekStart, weeksAgo) => {
        const students = cohorts.sizes.get(weekStart) ?? 0;
        const active = cohorts.active.get(weekStart);
        return {
          weekStart,
          students,
          weeks: students === 0 ? [] : Array.from({ length: weeksAgo + 1 }, (_, week) => (week === 0 ? 100 : emptyRate(active?.get(week) ?? 0, students))),
        };
      }),
      cost,
      topics,
      hiddenTeam: numbers.hiddenTeam,
    },
  };
});
