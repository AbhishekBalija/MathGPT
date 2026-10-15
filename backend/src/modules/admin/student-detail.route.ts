/**
 * GET /admin/students/:id - one student: who they are, what they did and
 * how much of today's free limit is used. Mounted behind requireUser and requireAdmin.
 */

import { pathParam, route } from "../../lib/http";
import { isUuid } from "../../lib/ids";
import { DAILY_FREE_LIMIT, usedToday } from "../users/daily-limit";
import { userRepository } from "../users/user.repository";
import { studentsRepository } from "./students/students.repository";


const PROVIDER_NAMES: Record<string, string> = { email: "email", google: "Google" };

export const adminStudentDetailRoute = route(async (req) => {
  const id = pathParam(req, "id");
  const user = isUuid(id) ? await userRepository.findById(id) : null;
  if (!user) {
    return { status: 404, body: { error: "Student not found" } };
  }

  const activity = await studentsRepository.activity(user.id);

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
      usedToday: usedToday(user),
      dailyLimit: DAILY_FREE_LIMIT,
      history: activity.history.map((item) => ({
        kind: item.kind,
        title: item.kind === "joined" ? `Joined with ${PROVIDER_NAMES[item.title] ?? item.title}` : item.title,
        at: item.at.toISOString(),
      })),
    },
  };
});
