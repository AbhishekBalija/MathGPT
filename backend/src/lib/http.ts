/**
 * Helpers that turn our route functions into Express handlers.
 *
 * Every route returns a plain `{ status, body }` object instead of calling
 * `res.status().json()` itself. That keeps routes easy to read and test, and
 * this file is the only place that talks to Express's `res`.
 */

import type { Request, RequestHandler } from "express";
import type { z } from "zod";

export interface ApiResult {
  status: number;
  body: unknown;
}

/** Wraps a route that reads `req` itself (headers, params, query). */
export function route(
  handler: (req: Request) => Promise<ApiResult>
): RequestHandler {
  return async (req, res) => {
    const result = await handler(req);
    res.status(result.status).json(result.body);
  };
}

/**
 * Wraps a route whose JSON body must match `schema`.
 *
 * The body is validated before the handler runs. Invalid input gets a 400
 * with the first validation message, and the handler receives the parsed,
 * typed body.
 */
export function routeWithBody<Schema extends z.ZodType>(
  schema: Schema,
  handler: (req: Request, body: z.output<Schema>) => Promise<ApiResult>
): RequestHandler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" });
      return;
    }

    const result = await handler(req, parsed.data);
    res.status(result.status).json(result.body);
  };
}

/** Reads a named path segment, e.g. `id` from `/api/solution/:id`. */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === "string" ? value : "";
}

/**
 * Reads one query string value, e.g. `?limit=20`.
 * Returns undefined when it is missing or sent more than once.
 */
export function queryParam(req: Request, name: string): string | undefined {
  const value = req.query[name];
  return typeof value === "string" ? value : undefined;
}
