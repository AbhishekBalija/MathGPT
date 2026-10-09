/** Errors the AI solver can throw, shared by the real and the fake solver. */

export class UnsolvableProblemError extends Error {
  /** The AI's own reason, for server logs only. Never sent to the client. */
  readonly reason?: string;

  constructor(message: string, reason?: string) {
    super(message);
    this.reason = reason;
    this.name = "UnsolvableProblemError";
  }
}

/** The AI answered twice and neither answer matched the solution format. */
export class InvalidSolverOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSolverOutputError";
  }
}
