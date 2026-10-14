import { describe, expect, it } from "vitest";
import { errorCodeFor, isProviderFailure } from "../../src/modules/solver/error-code";
import { AllModelsFailedError, ModelTimeoutError } from "../../src/services/ai/failover";

function bothFailed(primary: string, backup: string): AllModelsFailedError {
  return new AllModelsFailedError([
    { label: "gemini-2.5-flash", reason: primary },
    { label: "backup", reason: backup },
  ]);
}

describe("errorCodeFor", () => {
  it.each([
    // Gemini's quota errors also say "Error fetching", so the limit has to win
    ["a rate limit", bothFailed("[GoogleGenerativeAI Error]: Error fetching from https://x: [429 Too Many Requests] quota exceeded", "rate limit"), "AI_RATE_LIMITED"],
    ["a fetch error", bothFailed("[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com", "fetch failed"), "AI_UNREACHABLE"],
    ["both models timing out", bothFailed("gemini-2.5-flash timed out after 30000ms", "backup timed out after 30000ms"), "AI_TIMEOUT"],
    ["anything else from both models", bothFailed("bad JSON", "bad JSON"), "ALL_MODELS_FAILED"],
    ["one model timing out", new ModelTimeoutError("gemini", 30000), "AI_TIMEOUT"],
    // Our own errors are never blamed on the AI, even when they mention a timeout
    ["a database timeout", new Error("connection timeout"), "UNKNOWN_ERROR"],
    ["a reply that only mentions fetching", bothFailed("could not fetch the answer field", "bad JSON"), "ALL_MODELS_FAILED"],
    ["a plain error", new Error("All models failed"), "UNKNOWN_ERROR"],
    ["something that is not an error", "not an error", "UNKNOWN_ERROR"],
  ])("gives the right code for %s", (_name, error, code) => {
    expect(errorCodeFor(error)).toBe(code);
  });
});

describe("isProviderFailure", () => {
  it("is true only for failures that come from the AI providers", () => {
    expect(["AI_RATE_LIMITED", "AI_TIMEOUT", "AI_UNREACHABLE", "ALL_MODELS_FAILED"].every(isProviderFailure)).toBe(true);
    expect(isProviderFailure("UNKNOWN_ERROR")).toBe(false);
    expect(isProviderFailure("INVALID_OUTPUT")).toBe(false);
  });
});

describe("AllModelsFailedError", () => {
  it("keeps each attempt and the same reasons text as before", () => {
    const error = bothFailed("timed out", "404");

    expect(error.attempts).toEqual([
      { label: "gemini-2.5-flash", reason: "timed out" },
      { label: "backup", reason: "404" },
    ]);
    expect(error.reasons).toBe("gemini-2.5-flash: timed out | backup: 404");
  });
});
