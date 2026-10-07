import { z } from "zod";

const uuidSchema = z.uuid();

/**
 * True for a valid UUID. Repositories treat anything else as "not found",
 * so malformed ids from URLs or tokens never reach the database.
 */
export function isUuid(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}
