/**
 * Failed solves for the admin, grouped: one row per student and problem.
 *
 * GET  /admin/failed?status=open|resolved|all (default open)
 * GET  /admin/failed/:id - one group, with every try
 * POST /admin/failed/:id/resolve - resolves every try in the group
 *
 * Mounted behind requireUser and requireAdmin.
 */

import { z } from "zod";
import { pathParam, queryParam, route } from "../../../lib/http";
import { logger } from "../../../lib/logger";
import { getCurrentUser } from "../../auth/auth.middleware";
import { failedRepository, type FailedGroup } from "./failed.repository";

// Bad or missing values fall back to the default instead of reaching the database
const statusSchema = z.enum(["open", "resolved", "all"]).catch("open");
const MAX_GROUPS = 200;

function groupBody(group: FailedGroup) {
  return { ...group, firstAt: group.firstAt.toISOString(), lastAt: group.lastAt.toISOString() };
}

export const adminFailedListRoute = route(async (req) => {
  const status = statusSchema.parse(queryParam(req, "status") ?? "open");
  const { groups, problems, tries } = await failedRepository.listGroups(status, MAX_GROUPS);
  return { status: 200, body: { groups: groups.map(groupBody), problems, tries } };
});

export const adminFailedDetailRoute = route(async (req) => {
  const group = await failedRepository.findGroup(pathParam(req, "id"));
  if (!group) {
    return { status: 404, body: { error: "Failed solve not found" } };
  }
  return {
    status: 200,
    body: {
      ...groupBody(group),
      attempts: group.attempts.map((attempt) => ({ ...attempt, at: attempt.at.toISOString() })),
    },
  };
});

export const adminFailedResolveRoute = route(async (req) => {
  const admin = getCurrentUser(req);
  const id = pathParam(req, "id");

  const resolved = await failedRepository.resolveGroup(id, admin.id);
  if (resolved === null) {
    return { status: 404, body: { error: "Failed solve not found" } };
  }

  logger.info("Failed solve resolved", { errorId: id, tries: resolved, resolvedBy: admin.id });
  return { status: 200, body: { resolved } };
});
