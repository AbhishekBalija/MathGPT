/** Errors the AI solver can throw, shared by the real and the fake solver. */

export class UnsolvableProblemError extends Error {
  constructor(message: string) {
    super(message);
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
