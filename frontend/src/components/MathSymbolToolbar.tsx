import { useState, useRef, useEffect, useCallback } from "react";

// Symbol categories with their items
const SYMBOL_CATEGORIES = {
  basic: {
    label: "Basic",
    icon: "±",
    symbols: [
      { symbol: "²", label: "squared", insert: "²" },
      { symbol: "³", label: "cubed", insert: "³" },
      { symbol: "⁴", label: "to the 4th", insert: "⁴" },
      { symbol: "ⁿ", label: "to the n", insert: "ⁿ" },
      { symbol: "√", label: "square root", insert: "√" },
      { symbol: "∛", label: "cube root", insert: "∛" },
      { symbol: "±", label: "plus minus", insert: "±" },
      { symbol: "÷", label: "divide", insert: "÷" },
      { symbol: "×", label: "multiply", insert: "×" },
      { symbol: "≠", label: "not equal", insert: "≠" },
      { symbol: "≈", label: "approximately", insert: "≈" },
      { symbol: "≤", label: "less than or equal", insert: "≤" },
      { symbol: "≥", label: "greater than or equal", insert: "≥" },
      { symbol: "∞", label: "infinity", insert: "∞" },
    ],
  },
  greek: {
    label: "Greek",
    icon: "π",
    symbols: [
      { symbol: "π", label: "pi", insert: "π" },
      { symbol: "θ", label: "theta", insert: "θ" },
      { symbol: "α", label: "alpha", insert: "α" },
      { symbol: "β", label: "beta", insert: "β" },
      { symbol: "γ", label: "gamma", insert: "γ" },
      { symbol: "δ", label: "delta", insert: "δ" },
      { symbol: "ε", label: "epsilon", insert: "ε" },
      { symbol: "λ", label: "lambda", insert: "λ" },
      { symbol: "μ", label: "mu", insert: "μ" },
      { symbol: "σ", label: "sigma", insert: "σ" },
      { symbol: "φ", label: "phi", insert: "φ" },
      { symbol: "ω", label: "omega", insert: "ω" },
      { symbol: "Δ", label: "Delta", insert: "Δ" },
      { symbol: "Σ", label: "Sigma", insert: "Σ" },
    ],
  },
  calculus: {
    label: "Calculus",
    icon: "∫",
    symbols: [
      { symbol: "∫", label: "integral", insert: "∫" },
      { symbol: "∬", label: "double integral", insert: "∬" },
      { symbol: "∂", label: "partial", insert: "∂" },
      { symbol: "∇", label: "nabla", insert: "∇" },
      { symbol: "Σ", label: "summation", insert: "Σ" },
      { symbol: "∏", label: "product", insert: "∏" },
      { symbol: "lim", label: "limit", insert: "lim" },
      { symbol: "→", label: "arrow", insert: "→" },
      { symbol: "dx", label: "dx", insert: "dx" },
      { symbol: "dy", label: "dy", insert: "dy" },
      { symbol: "f'", label: "derivative", insert: "f'" },
      { symbol: 'f"', label: "second derivative", insert: 'f"' },
    ],
  },
  trig: {
    label: "Trig",
    icon: "sin",
    symbols: [
      { symbol: "sin", label: "sine", insert: "sin(" },
      { symbol: "cos", label: "cosine", insert: "cos(" },
      { symbol: "tan", label: "tangent", insert: "tan(" },
      { symbol: "sec", label: "secant", insert: "sec(" },
      { symbol: "csc", label: "cosecant", insert: "csc(" },
      { symbol: "cot", label: "cotangent", insert: "cot(" },
      { symbol: "sin⁻¹", label: "arcsin", insert: "arcsin(" },
      { symbol: "cos⁻¹", label: "arccos", insert: "arccos(" },
      { symbol: "tan⁻¹", label: "arctan", insert: "arctan(" },
      { symbol: "log", label: "log", insert: "log(" },
      { symbol: "ln", label: "natural log", insert: "ln(" },
      { symbol: "e", label: "euler number", insert: "e" },
    ],
  },
  subscripts: {
    label: "Sub",
    icon: "x₁",
    symbols: [
      { symbol: "₀", label: "subscript 0", insert: "₀" },
      { symbol: "₁", label: "subscript 1", insert: "₁" },
      { symbol: "₂", label: "subscript 2", insert: "₂" },
      { symbol: "₃", label: "subscript 3", insert: "₃" },
      { symbol: "₄", label: "subscript 4", insert: "₄" },
      { symbol: "₅", label: "subscript 5", insert: "₅" },
      { symbol: "₆", label: "subscript 6", insert: "₆" },
      { symbol: "₇", label: "subscript 7", insert: "₇" },
      { symbol: "₈", label: "subscript 8", insert: "₈" },
      { symbol: "₉", label: "subscript 9", insert: "₉" },
      { symbol: "ₙ", label: "subscript n", insert: "ₙ" },
      { symbol: "ₓ", label: "subscript x", insert: "ₓ" },
    ],
  },
};

type CategoryKey = keyof typeof SYMBOL_CATEGORIES;

interface MathSymbolToolbarProps {
  onSymbolInsert: (symbol: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MathSymbolToolbar = ({
  onSymbolInsert,
  isCollapsed = false,
  onToggleCollapse,
}: MathSymbolToolbarProps) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("basic");
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Load recent symbols from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("mathSymbols_recent");
    if (stored) {
      try {
        setRecentSymbols(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save recent symbols to localStorage
  const addToRecent = useCallback((symbol: string) => {
    setRecentSymbols((prev) => {
      const newRecent = [symbol, ...prev.filter((s) => s !== symbol)].slice(
        0,
        8
      );
      localStorage.setItem("mathSymbols_recent", JSON.stringify(newRecent));
      return newRecent;
    });
  }, []);

  const handleSymbolClick = (symbol: string, insert: string) => {
    addToRecent(symbol);
    onSymbolInsert(insert);
  };

  const categories = Object.entries(SYMBOL_CATEGORIES) as [
    CategoryKey,
    typeof SYMBOL_CATEGORIES.basic
  ][];

  return (
    <div
      ref={toolbarRef}
      className={`
        bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
        rounded-xl transition-all duration-300 overflow-hidden
        ${isCollapsed ? "h-10" : "h-auto"}
      `}
    >
      {/* Header with category tabs */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* Recent symbols quick access */}
          {recentSymbols.length > 0 && !isCollapsed && (
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700 mr-1">
              {recentSymbols.slice(0, 4).map((sym, idx) => (
                <button
                  key={`recent-${idx}`}
                  onClick={() => onSymbolInsert(sym)}
                  className="w-7 h-7 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title={`Recently used: ${sym}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          {/* Category tabs */}
          {categories.map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`
                px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap
                ${
                  activeCategory === key
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }
              `}
            >
              <span className="mr-1">{category.icon}</span>
              <span className="hidden sm:inline">{category.label}</span>
            </button>
          ))}
        </div>

        {/* Collapse toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            title={isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                isCollapsed ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Symbol grid */}
      {!isCollapsed && (
        <div className="p-2">
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-1">
            {SYMBOL_CATEGORIES[activeCategory].symbols.map((item, idx) => (
              <button
                key={`${activeCategory}-${idx}`}
                onClick={() => handleSymbolClick(item.symbol, item.insert)}
                className="
                  w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center 
                  text-base sm:text-lg text-gray-700 dark:text-gray-200
                  bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30
                  border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600
                  rounded-lg transition-all active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                "
                title={item.label}
                aria-label={item.label}
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MathSymbolToolbar;
