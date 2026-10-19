import { useId, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { User } from "../../services/auth.service";
import { classService } from "../../services/class.service";
import { BOARDS, INDIAN_STATES, RANGES, isSchoolRange } from "./class-options";
import type {
  Board,
  ClassAnswer,
  ClassInfo,
  ClassRange,
} from "./class-options";
import { QuestionHeader } from "./QuestionHeader";

interface ClassStepsProps {
  // A saved answer to start from (the Profile's Change button)
  initial?: ClassInfo | null;
  onSaved: (user: User) => void;
  // Shows Skip. Skip on the class step skips Onboarding; on the board step it
  // keeps the class and leaves the board empty
  onSkip?: (user: User) => void;
  // Shows a back arrow on the class step too (the Profile goes back to itself)
  onBackFromFirst?: () => void;
}

/**
 * The two Onboarding questions (#39): which class, then which board or
 * university. Used by the welcome page and the Profile, so they never drift.
 */
export function ClassSteps({
  initial,
  onSaved,
  onSkip,
  onBackFromFirst,
}: ClassStepsProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [range, setRange] = useState<ClassRange | null>(initial?.range ?? null);
  const [helping, setHelping] = useState(initial?.helping ?? false);
  const [board, setBoard] = useState<Board | null>(initial?.board ?? null);
  const [state, setState] = useState(initial?.state ?? INDIAN_STATES[0] ?? "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const institutionId = useId();

  const isSchool = range !== null && isSchoolRange(range);

  // Runs one save or skip call, and keeps the student on the page if it fails
  async function run(call: () => Promise<User>, then: (user: User) => void) {
    setSaving(true);
    setFailed(false);
    try {
      then(await call());
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  // Only what applies to the chosen range is sent; skipping the board step sends the class alone
  function answer(withBoard: boolean): ClassAnswer {
    if (range === null) throw new Error("No class picked");
    const base: ClassAnswer = { range, helping };
    if (!withBoard) return base;
    if (!isSchool)
      return institution.trim()
        ? { ...base, institution: institution.trim() }
        : base;
    if (!board) return base;
    return board === "state" ? { ...base, board, state } : { ...base, board };
  }

  function skip() {
    if (!onSkip) return;
    if (step === 1) void run(() => classService.skip(), onSkip);
    else void run(() => classService.save(answer(false)), onSaved);
  }

  const showBack = step === 2 || onBackFromFirst !== undefined;
  const canFinish = isSchool ? board !== null : true;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center gap-3 py-3">
        {showBack ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => (step === 2 ? setStep(1) : onBackFromFirst?.())}
            className="-ml-2 grid size-11 place-items-center rounded-xl text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        {/* Two steps: the first half fills on step 1, all of it on step 2 */}
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
          aria-hidden="true"
        >
          <div
            className={`h-full rounded-full bg-gray-900 dark:bg-gray-50 ${step === 1 ? "w-1/2" : "w-full"}`}
          />
        </div>
        {onSkip ? (
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="min-h-11 px-1 text-sm font-semibold text-gray-600 disabled:opacity-50 dark:text-gray-400"
          >
            Skip
          </button>
        ) : (
          <span className="size-11" />
        )}
      </div>

      <div className="flex-1">
        {step === 1 ? (
          <fieldset>
            <legend className="sr-only">Your class</legend>
            <QuestionHeader
              question={
                helping
                  ? "Which class are you helping with?"
                  : "Which class are you in?"
              }
              why="So Neo shows the right amount of steps. You can change it any time."
            />
            <div className="space-y-2">
              {RANGES.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 dark:bg-white/5 ${
                    range === option.value
                      ? "border-2 border-gray-900 dark:border-gray-50"
                      : "border-gray-200 dark:border-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="class-range"
                    value={option.value}
                    checked={range === option.value}
                    onChange={() => setRange(option.value)}
                    className="sr-only"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900 dark:text-gray-50">
                      {option.label}
                    </span>
                    {option.sub ? (
                      <span className="block text-xs text-gray-600 dark:text-gray-400">
                        {option.sub}
                      </span>
                    ) : null}
                  </span>
                  <span className="whitespace-nowrap rounded-lg bg-gray-100 px-2 py-1 font-serif text-gray-700 dark:bg-white/10 dark:text-gray-300">
                    {option.example}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHelping((now) => !now)}
              className="mx-auto mt-3 block min-h-11 text-sm font-semibold text-brand-600 dark:text-brand-300"
            >
              {helping ? "I'm a student" : "I'm a parent or teacher"}
            </button>
          </fieldset>
        ) : isSchool ? (
          <fieldset>
            <legend className="sr-only">Your board</legend>
            <QuestionHeader
              question="Which board is your school?"
              why="Boards write answers a little differently."
            />
            <div className="grid grid-cols-2 gap-2">
              {BOARDS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl px-3 text-center text-sm font-semibold ${
                    board === option.value
                      ? "bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900"
                      : "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="board"
                    value={option.value}
                    checked={board === option.value}
                    onChange={() => setBoard(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {board === "state" ? (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Which state?
                </span>
                <select
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50"
                >
                  {INDIAN_STATES.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </fieldset>
        ) : (
          <div>
            <QuestionHeader
              question="Which university or college?"
              why="Optional. Helps Neo follow your syllabus later."
            />
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
              <label htmlFor={institutionId}>University or college</label>
              <span>Optional</span>
            </div>
            <input
              id={institutionId}
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              maxLength={120}
              placeholder="e.g. VTU, Christ University"
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-50"
            />
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-gray-200 pt-3 dark:border-white/10">
        {failed ? (
          <p
            role="alert"
            className="mb-2 text-sm text-gray-900 dark:text-gray-50"
          >
            Couldn't save that. Try again.
          </p>
        ) : null}
        {step === 1 ? (
          <button
            type="button"
            disabled={range === null}
            onClick={() => setStep(2)}
            className="min-h-12 w-full rounded-2xl bg-gray-900 font-semibold text-white disabled:opacity-40 dark:bg-gray-50 dark:text-gray-900"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={!canFinish || saving}
            onClick={() =>
              void run(() => classService.save(answer(true)), onSaved)
            }
            className="min-h-12 w-full rounded-2xl bg-gray-900 font-semibold text-white disabled:opacity-40 dark:bg-gray-50 dark:text-gray-900"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
