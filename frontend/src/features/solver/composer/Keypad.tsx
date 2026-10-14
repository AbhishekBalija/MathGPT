const KEYPAD_SYMBOLS = ["x²", "√", "π", "÷", "×", "(", ")", "∫", "θ", "≤", "≥"] as const;

interface KeypadProps {
  onInsert: (text: string) => void;
}

export function Keypad({ onInsert }: KeypadProps) {
  return (
    <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-11" role="group" aria-label="Math symbols">
      {KEYPAD_SYMBOLS.map((symbol) => (
        <button
          key={symbol}
          type="button"
          // Keep focus in the text field when a key is pressed.
          onMouseDown={(event) => event.preventDefault()}
          // "x²" is typed as "^2" so the solver understands it.
          onClick={() => onInsert(symbol === "x²" ? "^2" : symbol)}
          className="min-h-11 rounded-lg border border-gray-200 bg-white font-serif text-base text-gray-900 hover:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-50 dark:hover:border-white/30"
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}
