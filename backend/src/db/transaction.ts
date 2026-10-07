/**
 * Lets a service run several repository calls as one unit of work:
 *
 *   await inTransaction(async (tx) => {
 *     const user = await userRepository.create(data, tx);
 *     await emailVerificationRepository.replaceCode(user.id, ..., tx);
 *   });
 *
 * If anything inside throws, every write is rolled back. Repositories take
 * an optional `DbExecutor` and use the normal pool when none is passed.
 */

import { db } from "./client";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = typeof db | Transaction;

export function inTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(work);
}
