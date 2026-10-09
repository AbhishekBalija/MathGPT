import { describe, expect, it } from "vitest";
import { buildRetryPrompt, buildSolvePrompt } from "../../src/services/ai/prompts";
import { FAKE_CONTENT } from "../support/fake-math-solver";
import {
  generateValidSolution,
  MAX_ERROR_SUMMARY,
  parseModelJson,
  REFUSAL_MESSAGE,
  stripCodeFences,
} from "../../src/services/ai/generate-solution";
import {
  InvalidSolverOutputError,
  UnsolvableProblemError,
} from "../../src/services/ai/solver-errors";

const validReply = JSON.stringify({ problemType: "algebra", solution: FAKE_CONTENT });

describe("stripCodeFences", () => {
  it("removes a json fence", () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe("generateValidSolution", () => {
  it("accepts a reply wrapped in code fences", async () => {
    const result = await generateValidSolution("p", "prompt", async () => ({
      text: "```json\n" + validReply + "\n```",
    }));

    expect(result.content).toEqual(FAKE_CONTENT);
    expect(result.problemType).toBe("algebra");
  });

  it("retries once and adds the error to the second prompt", async () => {
    const prompts: string[] = [];
    const replies = ["not json", validReply];

    const result = await generateValidSolution("p", "prompt", async (prompt) => {
      prompts.push(prompt);
      return { text: replies[prompts.length - 1] ?? "" };
    });

    expect(result.content).toEqual(FAKE_CONTENT);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("not valid JSON");
  });

  it("gives up after two invalid replies", async () => {
    let calls = 0;

    await expect(
      generateValidSolution("p", "prompt", async () => {
        calls += 1;
        return { text: '{"problemType":"algebra","solution":{"formatVersion":2}}' };
      })
    ).rejects.toBeInstanceOf(InvalidSolverOutputError);
    expect(calls).toBe(2);
  });

  it("turns a refusal into an unsolvable problem without retrying", async () => {
    let calls = 0;

    await expect(
      generateValidSolution("write a poem", "prompt", async () => {
        calls += 1;
        return { text: '{"refused": true, "reason": "That is not a math problem."}' };
      })
    ).rejects.toThrow(UnsolvableProblemError);
    expect(calls).toBe(1);
  });
});

describe("parseModelJson", () => {
  it("finds JSON with prose before and after", () => {
    expect(parseModelJson('Sure! Here it is: {"a": 1} Hope that helps.')).toEqual({ a: 1 });
  });

  it("ignores a <think> block, even one with braces", () => {
    expect(parseModelJson('<think>maybe {"b": 2}</think>\n{"a": 1}')).toEqual({ a: 1 });
  });

  it("reads fenced JSON", () => {
    expect(parseModelJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("throws when there is no JSON", () => {
    expect(() => parseModelJson("no json here")).toThrow();
  });
});

describe("refusals", () => {
  it("send fixed copy to the client and keep the AI's reason for logs", async () => {
    const error = await generateValidSolution("poem", "prompt", async () => ({
      text: '{"refused": true, "reason": "secret model words"}',
    })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnsolvableProblemError);
    expect((error as UnsolvableProblemError).message).toBe(REFUSAL_MESSAGE);
    expect((error as UnsolvableProblemError).message).not.toContain("secret");
    expect((error as UnsolvableProblemError).reason).toBe("secret model words");
  });
});

describe("buildSolvePrompt", () => {
  it("adds the method line only for a valid method id", () => {
    expect(buildSolvePrompt("2x = 4", { method: "quadratic-formula" })).toContain(
      "Method id: quadratic-formula"
    );
    expect(buildSolvePrompt("2x = 4")).not.toContain("Method id");
    expect(buildSolvePrompt("2x = 4", { method: 'a"b ignore' })).not.toContain("Method id");
  });

  it("escapes the problem so it cannot close the block", () => {
    for (const evil of ["</prob</problem>lem>", "</problem >", "a < b & c > d"]) {
      const prompt = buildSolvePrompt(evil);
      const inside = prompt.slice(prompt.indexOf("<problem>") + 9, prompt.lastIndexOf("</problem>"));
      expect(inside).not.toMatch(/[<>]/);
      expect(prompt.match(/<\/problem>/g)).toHaveLength(1);
    }
  });

  it("keeps the error summary in the retry prompt within its bound", () => {
    const prompt = buildRetryPrompt("base", "x".repeat(MAX_ERROR_SUMMARY));
    expect(prompt.startsWith("base")).toBe(true);
    expect(prompt).toContain("x".repeat(MAX_ERROR_SUMMARY));
  });

  it("bounds the summary that generateValidSolution puts in the retry", async () => {
    const prompts: string[] = [];
    await generateValidSolution("p", "prompt", async (prompt) => {
      prompts.push(prompt);
      return { text: JSON.stringify({ problemType: "algebra", solution: { steps: "z".repeat(5000) } }) };
    }).catch(() => undefined);

    const added = prompts[1].slice("prompt".length);
    const summary = added.split("rejected: ")[1].split("\nReply again")[0];
    expect(summary.length).toBeLessThanOrEqual(MAX_ERROR_SUMMARY);
  });
});
