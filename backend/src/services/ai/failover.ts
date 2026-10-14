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

// Each reason is cut to this length so one huge provider error cannot fill the log
const MAX_REASON_LENGTH = 300;

/**
 * Both models failed. The message stays generic because the student sees it;
 * `reasons` holds what each model actually said, for the admin error log.
 */
export class AllModelsFailedError extends Error {
  readonly attempts: ReadonlyArray<{ label: string; reason: string }>;
  readonly reasons: string;

  constructor(attempts: Array<{ label: string; reason: string }>) {
    super("All models failed");
    this.name = "AllModelsFailedError";
    this.attempts = attempts;
    this.reasons = attempts.map((attempt) => `${attempt.label}: ${attempt.reason}`).join(" | ");
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
  let primaryReason: string;
  try {
    const value = await withTimeout(primary.run(), primary.timeoutMs, primary.label);
    return { value, usedBackup: false };
  } catch (error) {
    primaryReason = errorMessage(error);
    console.log(`${primary.label} failed, trying ${backup.label}: ${primaryReason}`);
  }

  try {
    const value = await withTimeout(backup.run(), backup.timeoutMs, backup.label);
    return { value, usedBackup: true };
  } catch (error) {
    const backupReason = errorMessage(error);
    console.log(`${backup.label} failed too: ${backupReason}`);
    throw new AllModelsFailedError([
      { label: primary.label, reason: primaryReason },
      { label: backup.label, reason: backupReason },
    ]);
  }
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.slice(0, MAX_REASON_LENGTH);
}
