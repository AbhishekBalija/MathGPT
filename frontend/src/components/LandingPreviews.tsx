import katex from "katex";

// Small, static slices of the real app for the landing page feature cards.
// They show the product itself instead of stock artwork.

// Fixed strings written here, never user input, so rendering them as HTML is safe
const renderMath = (latex: string) =>
  katex.renderToString(latex, { throwOnError: false, displayMode: false });

const previewFrame =
  "w-full h-full rounded-2xl bg-gray-50 dark:bg-[#15171c] p-5 sm:p-6 flex flex-col justify-center gap-3 overflow-hidden";

const steps = [
  {
    number: 1,
    title: "Find two numbers that multiply to 6 and add to 5",
    math: "2 \\times 3 = 6,\\quad 2 + 3 = 5",
    why: "These go inside the brackets",
  },
  {
    number: 2,
    title: "Factor the quadratic",
    math: "(x + 2)(x + 3) = 0",
    why: "Multiply it out to check: x² + 5x + 6",
  },
  {
    number: 3,
    title: "Set each factor to zero",
    math: "x + 2 = 0 \\;\\text{or}\\; x + 3 = 0",
    why: "If a product is 0, one factor must be 0",
  },
];

export const StepPreview = () => (
  <div className={previewFrame} aria-hidden="true">
    <div className="w-full max-w-lg mx-auto flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Solve{" "}
        <span
          className="text-gray-900 dark:text-white"
          dangerouslySetInnerHTML={{ __html: renderMath("x^2 + 5x + 6 = 0") }}
        />
      </p>
      {steps.map((step) => (
        <div
          key={step.number}
          className="rounded-xl bg-white dark:bg-[#0f1115] border border-gray-100 dark:border-gray-800 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 shrink-0 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
              {step.number}
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {step.title}
            </span>
          </div>
          <div
            className="mt-2 text-gray-900 dark:text-white"
            dangerouslySetInnerHTML={{ __html: renderMath(step.math) }}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {step.why}
          </p>
        </div>
      ))}
      <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-medium text-brand-600 dark:text-brand-300">
          Answer
        </span>
        <span
          className="text-gray-900 dark:text-white"
          dangerouslySetInnerHTML={{
            __html: renderMath("x = -2 \\;\\text{or}\\; x = -3"),
          }}
        />
      </div>
    </div>
  </div>
);

const symbolRows = [
  ["²", "√", "π", "θ", "∞", "±"],
  ["∫", "∑", "∂", "≤", "≥", "≈"],
];

export const SymbolBarPreview = () => (
  <div className={previewFrame} aria-hidden="true">
    <div className="flex gap-1.5 text-xs">
      {["Basic", "Greek", "Calculus", "Trig"].map((tab, i) => (
        <span
          key={tab}
          className={
            i === 2
              ? "px-2.5 py-1 rounded-lg bg-brand-500 text-white font-medium"
              : "px-2.5 py-1 rounded-lg text-gray-500 dark:text-gray-400"
          }
        >
          {tab}
        </span>
      ))}
    </div>
    {symbolRows.map((row) => (
      <div key={row.join("")} className="grid grid-cols-6 gap-1.5">
        {row.map((symbol) => (
          <span
            key={symbol}
            className="aspect-square rounded-lg bg-white dark:bg-[#0f1115] border border-gray-100 dark:border-gray-800 flex items-center justify-center font-serif text-lg text-gray-800 dark:text-gray-200"
          >
            {symbol}
          </span>
        ))}
      </div>
    ))}
    <div className="mt-1 rounded-xl border border-brand-500/60 bg-white dark:bg-[#0f1115] px-4 py-3 text-sm text-gray-900 dark:text-white">
      ∫ x² dx<span className="text-brand-500">|</span>
    </div>
  </div>
);

const history = [
  { group: "Today", items: ["x² + 5x + 6 = 0", "Derivative of sin(x)"] },
  {
    group: "This week",
    items: ["Integrate x² dx", "Simplify (3x² + 6x) / 3x", "P(two heads in 3 flips)"],
  },
];

export const HistoryPreview = () => (
  <div className={previewFrame} aria-hidden="true">
    {history.map(({ group, items }) => (
      <div key={group}>
        <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {group}
        </p>
        {items.map((item, i) => (
          <p
            key={item}
            className={
              group === "Today" && i === 0
                ? "px-3 py-2 rounded-lg text-sm bg-white dark:bg-[#0f1115] border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white"
                : "px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
            }
          >
            {item}
          </p>
        ))}
      </div>
    ))}
  </div>
);
