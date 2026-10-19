import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, Check } from "lucide-react";
import type { User } from "../../services/auth.service";
import { classService } from "../../services/class.service";
import { BOARDS, INDIAN_STATES, RANGES, ROLES, isSchoolRange } from "./class-options";
import type { Board, ClassAnswer, ClassInfo, ClassRange, Role } from "./class-options";
import { QuestionHeader } from "./QuestionHeader";

interface ClassStepsProps {
  // A saved answer to start from (the Profile's Change button)
  initial?: ClassInfo | null;
  onSaved: (user: User) => void;
  // Shows Skip. On the role step it skips Onboarding (null if that call
  // failed, so the caller can still move on); on later steps it keeps what
  // was already picked
  onSkip?: (user: User | null) => void;
  // Shows a back arrow on the role step too (the Profile goes back to itself)
  onBackFromFirst?: () => void;
}

type Step = "role" | "class" | "board";
const STEPS: Step[] = ["role", "class", "board"];

const CLASS_QUESTION: Record<Role, { question: string; why: string }> = {
  student: { question: "Which class are you in?", why: "So Neo shows the right amount of steps. You can change it any time." },
  parent: {
    question: "Which class is your child in?",
    why: "More than one? Pick the one you'll help most. You can change it any time.",
  },
  teacher: { question: "Which classes do you teach?", why: "Pick all that apply." },
};

// Rows and chips arrive one after another (only when motion is allowed)
const stagger = (index: number): CSSProperties => ({ animationDelay: `${60 + index * 30}ms` });

const ROW =
  "ob-item ob-press flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 dark:bg-white/5 dark:has-[:focus-visible]:ring-brand-300";
const ROW_ON = "border-2 border-gray-900 dark:border-gray-50";
const ROW_OFF = "border-gray-200 dark:border-white/10";
const BUTTON =
  "ob-press min-h-12 w-full rounded-2xl bg-gray-900 font-semibold text-white disabled:opacity-40 dark:bg-gray-50 dark:text-gray-900";

/**
 * The Onboarding questions (#39): who is using NeoMath, which class, then
 * which board or university. Used by the welcome page and the Profile, so
 * they never drift apart.
 */
export function ClassSteps({ initial, onSaved, onSkip, onBackFromFirst }: ClassStepsProps) {
  const [step, setStep] = useState<Step>("role");
  // Which way the last move went, so the step slides in from the right side
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [role, setRole] = useState<Role | null>(initial?.role ?? null);
  const [ranges, setRanges] = useState<ClassRange[]>(initial?.ranges ?? []);
  const [board, setBoard] = useState<Board | null>(initial?.board ?? null);
  const [state, setState] = useState(initial?.state ?? INDIAN_STATES[0] ?? "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const institutionId = useId();

  const hasSchool = ranges.some(isSchoolRange);
  const hasCollege = ranges.includes("college");

  function go(next: Step, way: "forward" | "back") {
    setDirection(way);
    setStep(next);
  }

  // Runs one save, and keeps the student on the page if it fails
  async function run(answer: ClassAnswer) {
    setSaving(true);
    setFailed(false);
    try {
      onSaved(await classService.save(answer));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  // Only what applies is sent: a skip keeps what was picked on earlier steps
  function answer(upTo: Step): ClassAnswer {
    if (role === null) throw new Error("No role picked");
    if (upTo === "role" || ranges.length === 0) return { role };
    const picked: ClassAnswer = { role, ranges };
    if (upTo === "class") return picked;
    const withBoard = hasSchool && board ? (board === "state" ? { board, state } : { board }) : {};
    const withInstitution = hasCollege && institution.trim() ? { institution: institution.trim() } : {};
    return { ...picked, ...withBoard, ...withInstitution };
  }

  function skip() {
    if (!onSkip) return;
    if (step === "role") {
      // A failed skip still lets the student go: solving is never blocked
      classService.skip().then(onSkip, () => onSkip(null));
      return;
    }
    void run(answer(step === "class" ? "role" : "class"));
  }

  function pickRange(range: ClassRange) {
    if (role !== "teacher") {
      setRanges([range]);
      return;
    }
    // Keep the teacher's picks in the same order as the rows
    setRanges((now: ClassRange[]) =>
      now.includes(range)
        ? now.filter((r) => r !== range)
        : RANGES.map((r) => r.value).filter((r) => r === range || now.includes(r))
    );
  }

  function pickRole(next: Role) {
    // A student or parent has one class; trim a teacher's list when switching
    if (next !== "teacher" && ranges.length > 1) setRanges(ranges.slice(0, 1));
    setRole(next);
  }

  const stepIndex = STEPS.indexOf(step);
  const showBack = step !== "role" || onBackFromFirst !== undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center gap-3 py-3">
        {showBack ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => (step === "role" ? onBackFromFirst?.() : go(STEPS[stepIndex - 1] as Step, "back"))}
            className="-ml-2 grid size-11 place-items-center rounded-xl text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        {/* Three parts: role, class, board */}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" aria-hidden="true">
          <div
            className="ob-bar h-full w-full origin-left rounded-full bg-gray-900 dark:bg-gray-50"
            style={{ transform: `scaleX(${(stepIndex + 1) / STEPS.length})` }}
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

      {/* A new key on each step replays its slide-in */}
      <div key={step} className={`flex-1 ${direction === "forward" ? "ob-step-forward" : "ob-step-back"}`}>
        {step === "role" ? (
          <fieldset>
            <legend className="sr-only">Who's using NeoMath</legend>
            <QuestionHeader question="Who's using NeoMath?" why="If you're not sure, you can change it later." />
            <div className="space-y-2">
              {ROLES.map((option, index) => (
                <label key={option.value} style={stagger(index)} className={`${ROW} ${role === option.value ? ROW_ON : ROW_OFF}`}>
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => pickRole(option.value)}
                    className="sr-only"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900 dark:text-gray-50">{option.label}</span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400">{option.line}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`grid size-5.5 shrink-0 place-items-center rounded-full border-2 ${
                      role === option.value ? "border-gray-900 dark:border-gray-50" : "border-gray-300 dark:border-white/30"
                    }`}
                  >
                    {role === option.value ? <span className="ob-pop size-2.5 rounded-full bg-gray-900 dark:bg-gray-50" /> : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : step === "class" && role ? (
          <fieldset>
            <legend className="sr-only">{role === "teacher" ? "Your classes" : "Your class"}</legend>
            <QuestionHeader question={CLASS_QUESTION[role].question} why={CLASS_QUESTION[role].why} />
            <div className="space-y-2">
              {RANGES.map((option, index) => {
                const on = ranges.includes(option.value);
                return (
                  <label key={option.value} style={stagger(index)} className={`${ROW} ${on ? ROW_ON : ROW_OFF}`}>
                    <input
                      type={role === "teacher" ? "checkbox" : "radio"}
                      name="class-range"
                      value={option.value}
                      checked={on}
                      onChange={() => pickRange(option.value)}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-3">
                      {role === "teacher" ? (
                        <span
                          aria-hidden="true"
                          className={`grid size-5.5 shrink-0 place-items-center rounded-md border-2 ${
                            on
                              ? "border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900"
                              : "border-gray-300 dark:border-white/30"
                          }`}
                        >
                          {on ? <Check className="ob-pop size-3.5" strokeWidth={3} /> : null}
                        </span>
                      ) : null}
                      <span>
                        <span className="block font-semibold text-gray-900 dark:text-gray-50">{option.label}</span>
                        {option.sub ? <span className="block text-xs text-gray-600 dark:text-gray-400">{option.sub}</span> : null}
                      </span>
                    </span>
                    <span className="whitespace-nowrap rounded-lg bg-gray-100 px-2 py-1 font-serif text-gray-700 dark:bg-white/10 dark:text-gray-300">
                      {option.example}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div>
            <QuestionHeader
              question={
                hasSchool && hasCollege
                  ? "Where do you teach?"
                  : hasSchool
                    ? role === "parent"
                      ? "Which board is their school?"
                      : "Which board is your school?"
                    : "Which university or college?"
              }
              why={hasSchool ? "Boards write answers a little differently." : "Optional. Helps Neo follow your syllabus later."}
            />
            {hasSchool ? (
              <fieldset>
                <legend className="sr-only">Board</legend>
                <div className="grid grid-cols-2 gap-2">
                  {BOARDS.map((option, index) => (
                    <label
                      key={option.value}
                      style={stagger(index)}
                      className={`ob-item ob-press flex min-h-12 cursor-pointer items-center justify-center rounded-2xl px-3 text-center text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 dark:has-[:focus-visible]:ring-brand-300 ${
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
                    <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Which state?</span>
                    <select
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50 dark:[color-scheme:dark]"
                    >
                      {INDIAN_STATES.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </fieldset>
            ) : null}
            {hasCollege ? (
              <div className={hasSchool ? "mt-5" : ""}>
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
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-3 text-gray-900 placeholder:text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-50"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-gray-200 pt-3 dark:border-white/10">
        {failed ? (
          <p role="alert" className="mb-2 text-sm text-gray-900 dark:text-gray-50">
            Couldn't save that. Try again.
          </p>
        ) : null}
        {step === "role" ? (
          <button type="button" disabled={role === null} onClick={() => go("class", "forward")} className={BUTTON}>
            Continue
          </button>
        ) : step === "class" ? (
          <button type="button" disabled={ranges.length === 0} onClick={() => go("board", "forward")} className={BUTTON}>
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={(hasSchool && board === null) || saving}
            onClick={() => void run(answer("board"))}
            className={BUTTON}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
