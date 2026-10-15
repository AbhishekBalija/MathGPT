import { describe, expect, it } from "vitest";
import { nextAlert, type AlertRecord } from "../../src/modules/alerts/alert-rules";

const MIN = 60_000;
const START = Date.UTC(2026, 9, 15, 12, 0);

function fresh(): AlertRecord {
  return { status: "ok", recent: [], consecutive: 0, lastSentAt: null, changedAt: START };
}

type Event = Parameters<typeof nextAlert>[1];
const fail: Event = { kind: "failed", code: "AI_TIMEOUT" };
const ok: Event = { kind: "succeeded" };

// Runs events at the given minutes after START; returns what each one sent
function run(steps: Array<[number, Event]>, from = fresh()) {
  let record = from;
  const sent: Array<string | null> = [];
  for (const [minute, event] of steps) {
    const next = nextAlert(record, event, START + minute * MIN);
    record = next.record;
    sent.push(next.send);
  }
  return { record, sent };
}

describe("nextAlert", () => {
  it("sends nothing for 2 failures, and 'failing' on the 3rd in a row", () => {
    const { sent, record } = run([[0, fail], [1, fail], [2, fail]]);
    expect(sent).toEqual([null, null, "failing"]);
    expect(record.status).toBe("failing");
  });

  it("sends 'failing' for 3 failures within 10 minutes, even with successes between", () => {
    const { sent } = run([[0, fail], [1, ok], [4, fail], [5, ok], [9, fail]]);
    expect(sent.at(-1)).toBe("failing");
  });

  it("sends nothing for 3 failures spread over 11 minutes with successes between", () => {
    const { sent } = run([[0, fail], [1, ok], [5, fail], [6, ok], [11, fail]]);
    expect(sent).toEqual([null, null, null, null, null]);
  });

  it("while failing, waits 30 minutes before sending again", () => {
    const failing = run([[0, fail], [1, fail], [2, fail]]).record;
    expect(run([[22, fail]], failing).sent).toEqual([null]);
    expect(run([[33, fail]], failing).sent).toEqual(["failing"]);
  });

  it("sends 'recovered' on the first success after failing, and is ok again", () => {
    const failing = run([[0, fail], [1, fail], [2, fail]]).record;
    const { sent, record } = run([[5, ok], [6, ok]], failing);
    expect(sent).toEqual(["recovered", null]);
    expect(record).toMatchObject({ status: "ok", consecutive: 0, recent: [] });
  });

  it("never counts our own errors, only the AI providers'", () => {
    const ours: Event = { kind: "failed", code: "UNKNOWN_ERROR" };
    const { sent, record } = run([[0, ours], [1, ours], [2, ours], [3, ours]]);
    expect(sent).toEqual([null, null, null, null]);
    expect(record).toEqual(fresh());
  });

  it("forgets failures older than 10 minutes", () => {
    const { record } = run([[0, fail], [1, ok], [12, fail]]);
    expect(record.recent).toEqual([START + 12 * MIN]);
  });
});
