import { describe, expect, it, vi } from "vitest";
import { AllModelsFailedError, runWithFailover } from "../../src/services/ai/failover";

const never = () => new Promise<string>(() => {});
const fail = (message: string) => () => Promise.reject(new Error(message));

describe("runWithFailover", () => {
  it("uses the primary answer and never calls the backup", async () => {
    const backup = vi.fn(() => Promise.resolve("backup"));
    const result = await runWithFailover(
      { label: "primary", run: () => Promise.resolve("primary"), timeoutMs: 1000 },
      { label: "backup", run: backup, timeoutMs: 1000 }
    );
    expect(result).toEqual({ value: "primary", usedBackup: false });
    expect(backup).not.toHaveBeenCalled();
  });

  it("uses the backup when the primary fails", async () => {
    const result = await runWithFailover(
      { label: "primary", run: fail("503 overloaded"), timeoutMs: 1000 },
      { label: "backup", run: () => Promise.resolve("backup"), timeoutMs: 1000 }
    );
    expect(result).toEqual({ value: "backup", usedBackup: true });
  });

  it("uses the backup when the primary takes too long", async () => {
    const result = await runWithFailover(
      { label: "primary", run: never, timeoutMs: 20 },
      { label: "backup", run: () => Promise.resolve("backup"), timeoutMs: 1000 }
    );
    expect(result).toEqual({ value: "backup", usedBackup: true });
  });

  it("only starts the backup after the primary has given up", async () => {
    const backup = vi.fn(() => Promise.resolve("backup"));
    const primary = new Promise<string>((resolve) => setTimeout(() => resolve("slow primary"), 30));
    const result = await runWithFailover(
      { label: "primary", run: () => primary, timeoutMs: 1000 },
      { label: "backup", run: backup, timeoutMs: 1000 }
    );
    expect(result.value).toBe("slow primary");
    expect(backup).not.toHaveBeenCalled();
  });

  it("fails when both models fail", async () => {
    await expect(
      runWithFailover(
        { label: "primary", run: fail("503"), timeoutMs: 1000 },
        { label: "backup", run: fail("404"), timeoutMs: 1000 }
      )
    ).rejects.toThrow("All models failed");
  });

  it("keeps each model's reason when both fail", async () => {
    const error = await runWithFailover(
      { label: "primary", run: fail("503 overloaded"), timeoutMs: 1000 },
      { label: "backup", run: fail("404 no endpoints"), timeoutMs: 1000 }
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AllModelsFailedError);
    // The message stays generic because it is shown to the student
    expect((error as AllModelsFailedError).message).toBe("All models failed");
    expect((error as AllModelsFailedError).reasons).toBe(
      "primary: 503 overloaded | backup: 404 no endpoints"
    );
  });

  it("cuts very long reasons short", async () => {
    const error = (await runWithFailover(
      { label: "primary", run: fail("x".repeat(2000)), timeoutMs: 1000 },
      { label: "backup", run: fail("404"), timeoutMs: 1000 }
    ).catch((caught: unknown) => caught)) as AllModelsFailedError;

    expect(error.reasons.length).toBeLessThan(700);
    expect(error.reasons).toContain("backup: 404");
  });

  it("fails when the backup also takes too long", async () => {
    await expect(
      runWithFailover(
        { label: "primary", run: never, timeoutMs: 20 },
        { label: "backup", run: never, timeoutMs: 20 }
      )
    ).rejects.toThrow("All models failed");
  });
});
