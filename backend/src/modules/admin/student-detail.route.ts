/**
 * GET /admin/students/:id - one student: who they are, what they did and
 * how much of today's free limit is used. Mounted behind requireUser and requireAdmin.
 */

import { pathParam, route } from "../../lib/http";
import { isUuid } from "../../lib/ids";
import { userRepository } from "../users/user.repository";
import { studentsRepository } from "./students/students.repository";

// Same daily limit and reset rule as the solve and profile routes
const DAILY_FREE_LIMIT = 5;

const PROVIDER_NAMES: Record<string, string> = { email: "email", google: "Google" };

export const adminStudentDetailRoute = route(async (req) => {
  const id = pathParam(req, "id");
  const user = isUuid(id) ? await userRepository.findById(id) : null;
  if (!user) {
    return { status: 404, body: { error: "Student not found" } };
  }

  const activity = await studentsRepository.activity(user.id);
  const resetToday = new Date(user.lastCreditReset).toDateString() === new Date().toDateString();

  return {
    status: 200,
    body: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      joinedAt: user.createdAt.toISOString(),
      isAdmin: user.isAdmin,
      // Admins always count as team
      isTeam: user.isTeam || user.isAdmin,
      solves: activity.solves,
      failed: activity.failed,
      reports: activity.reports,
      usedToday: resetToday ? user.dailyCreditsUsed : 0,
      dailyLimit: DAILY_FREE_LIMIT,
      history: activity.history.map((item) => ({
        kind: item.kind,
        title: item.kind === "joined" ? `Joined with ${PROVIDER_NAMES[item.title] ?? item.title}` : item.title,
        at: item.at.toISOString(),
      })),
    },
  };
});
