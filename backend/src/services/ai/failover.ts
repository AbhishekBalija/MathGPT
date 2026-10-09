/**
 * Sequential failover: try the primary model first, and only if it fails or
 * takes too long, try the backup once. Only one model runs at a time, so a
 * failing backup can never cancel a primary that is still working.
 */

export class ModelTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "ModelTimeoutError";
  }
}

// Rejects if the work does not finish in time. The timer is always cleared.
export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ModelTimeoutError(label, timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export interface FailoverStep<T> {
  label: string;
  run: () => Promise<T>;
  timeoutMs: number;
}

export interface FailoverResult<T> {
  value: T;
  usedBackup: boolean;
}

export async function runWithFailover<T>(
  primary: FailoverStep<T>,
  backup: FailoverStep<T>
): Promise<FailoverResult<T>> {
  try {
    const value = await withTimeout(primary.run(), primary.timeoutMs, primary.label);
    return { value, usedBackup: false };
  } catch (error) {
    console.log(`${primary.label} failed, trying ${backup.label}: ${errorMessage(error)}`);
  }

  try {
    const value = await withTimeout(backup.run(), backup.timeoutMs, backup.label);
    return { value, usedBackup: true };
  } catch (error) {
    console.log(`${backup.label} failed too: ${errorMessage(error)}`);
    throw new Error("All models failed");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
