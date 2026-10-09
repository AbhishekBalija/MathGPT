import { describe, expect, it, vi } from "vitest";
import { runWithFailover } from "../../src/services/ai/failover";

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

  it("fails when the backup also takes too long", async () => {
    await expect(
      runWithFailover(
        { label: "primary", run: never, timeoutMs: 20 },
        { label: "backup", run: never, timeoutMs: 20 }
      )
    ).rejects.toThrow("All models failed");
  });
});
