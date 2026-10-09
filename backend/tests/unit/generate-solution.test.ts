import { describe, expect, it } from "vitest";
import { FAKE_CONTENT } from "../support/fake-math-solver";
import { generateValidSolution, stripCodeFences } from "../../src/services/ai/generate-solution";
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
